import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RequestHandler } from "express";
import type { Server } from "node:http";
import { encodePaymentResponseHeader } from "@x402/core/http";
import { createApp } from "../src/app.js";
import { createInbox } from "../src/store.js";

/**
 * Mocks with the same contract as the real gates:
 * - Gate 1 (SelfAgentVerifier.auth): 401 { error } unless verified, then sets req.agent.
 * - Gate 2 (x402 paymentMiddleware): 402 without a payment header; with one, settles only
 *   when the handler answered < 400 and sets PAYMENT-RESPONSE.
 */
const VERIFIED = "0x1111111111111111111111111111111111111111";
const fakeSelf: RequestHandler = (req, res, next) => {
  const addr = req.get("x-test-agent");
  if (!addr) return void res.status(401).json({ error: "Missing agent authentication headers" });
  if (addr !== VERIFIED) return void res.status(401).json({ error: "Agent not verified on-chain" });
  (req as unknown as { agent: object }).agent = { address: addr, agentId: 7n, agentKey: "0x", agentCount: 1n, nullifier: 1n };
  next();
};
let settled = 0;
const fakeX402: RequestHandler = (req, res, next) => {
  if (!(req.method === "POST" && req.path === "/offers")) return next();
  if (!req.get("payment-signature")) return void res.status(402).json({});
  const end = res.end.bind(res);
  res.end = ((...args: Parameters<typeof res.end>) => {
    if (res.statusCode < 400) {
      settled++;
      res.setHeader(
        "PAYMENT-RESPONSE",
        encodePaymentResponseHeader({ success: true, transaction: "0xabc", network: "eip155:42220", payer: VERIFIED } as never),
      );
    }
    return end(...args);
  }) as typeof res.end;
  next();
};

const offer = { brand: "Acme", title: "Reel collab", message: "One reel in December", budgetUsd: 250 };
let server: Server;
let base = "";
let inbox = createInbox();

beforeAll(async () => {
  const { app } = createApp({ gate1: fakeSelf, gate2: fakeX402, inbox, creatorToken: "secret" });
  await new Promise<void>((r) => {
    server = app.listen(0, () => r());
  });
  const a = server.address();
  base = `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}`;
});
afterAll(() => server?.close());
beforeEach(() => (settled = 0));

const post = (headers: Record<string, string>, body: unknown = offer) =>
  fetch(`${base}/offers`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const creator = { authorization: "Bearer secret" };

describe("POST /offers", () => {
  it("refuses an unsigned bot before asking it to pay", async () => {
    const r = await post({ "payment-signature": "x" });
    expect(r.status).toBe(401);
    expect(settled).toBe(0);
  });

  it("refuses an agent without a human proof", async () => {
    const r = await post({ "x-test-agent": "0x2222222222222222222222222222222222222222" });
    expect(r.status).toBe(401);
    expect((await r.json()).error).toBe("Agent not verified on-chain");
  });

  it("asks a verified agent to pay (402)", async () => {
    const r = await post({ "x-test-agent": VERIFIED });
    expect(r.status).toBe(402);
  });

  it("does not charge for an invalid offer", async () => {
    const r = await post({ "x-test-agent": VERIFIED, "payment-signature": "x" }, { brand: "Acme" });
    expect(r.status).toBe(400);
    expect(settled).toBe(0);
  });

  it("delivers a paid offer from a verified agent and records the settlement tx", async () => {
    const r = await post({ "x-test-agent": VERIFIED, "payment-signature": "x" });
    expect(r.status).toBe(201);
    const { offerId } = await r.json();
    expect(settled).toBe(1);
    const got = await (await fetch(`${base}/offers/${offerId}`, { headers: creator })).json();
    expect(got.agent).toEqual({ agentId: "7", address: VERIFIED });
    expect(got.payment.transaction).toBe("0xabc");
    expect(got.status).toBe("new");
  });
});

describe("creator inbox", () => {
  it("needs the creator token", async () => {
    expect((await fetch(`${base}/offers`)).status).toBe(401);
    expect((await fetch(`${base}/activity`)).status).toBe(401);
  });

  it("lists, accepts and declines offers", async () => {
    const list = await (await fetch(`${base}/offers`, { headers: creator })).json();
    expect(list.length).toBeGreaterThan(0);
    const id = list[0].id;
    const patch = (status: string) =>
      fetch(`${base}/offers/${id}`, { method: "PATCH", headers: { ...creator, "content-type": "application/json" }, body: JSON.stringify({ status }) });
    expect((await (await patch("accepted")).json()).status).toBe("accepted");
    expect((await patch("maybe")).status).toBe(400);
    expect((await fetch(`${base}/offers/nope`, { headers: creator })).status).toBe(404);
  });

  it("shows refused bots on the activity feed", async () => {
    const a = await (await fetch(`${base}/activity`, { headers: creator })).json();
    expect(a.stats.refusedUnverified).toBe(2);
    expect(a.stats.paymentsSettled).toBe(1);
    expect(a.recent.some((e: { detail: string }) => e.detail === "Agent not verified on-chain")).toBe(true);
  });
});
