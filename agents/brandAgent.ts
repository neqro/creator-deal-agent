/**
 * Demo BRAND agent (verified). Signs with its Self Agent ID key, and pays the x402 fee when asked.
 *   SERVICE_URL=http://localhost:3000 BRAND_AGENT_PRIVATE_KEY=0x... npm run agent:brand
 * Key lives only in your local env / .self/brand-agent.key. Never commit it.
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { SelfAgent } from "@selfxyz/agent-sdk";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const url = (process.env.SERVICE_URL ?? "http://localhost:3000").replace(/\/$/, "") + "/offers";
let key = process.env.BRAND_AGENT_PRIVATE_KEY?.trim();
if (!key && existsSync(".self/brand-agent.key")) key = readFileSync(".self/brand-agent.key", "utf8").trim();
if (!key) throw new Error("Set BRAND_AGENT_PRIVATE_KEY or create .self/brand-agent.key");
if (!key.startsWith("0x")) key = `0x${key}`;

const offer = {
  brand: process.env.BRAND_NAME ?? "Demo Coffee Co.",
  title: process.env.OFFER_TITLE ?? "Spring campaign: 3 reels",
  message: process.env.OFFER_MESSAGE ?? "We love your channel. Budget for 3 reels, product shipped free.",
  budgetUsd: Number(process.env.OFFER_BUDGET ?? 500),
  contact: process.env.OFFER_CONTACT ?? "hello@example.com",
};
const body = JSON.stringify(offer);

const self = new SelfAgent({ privateKey: key, network: "mainnet" });
const pay = new x402HTTPClient(registerExactEvmScheme(new x402Client(), { signer: privateKeyToAccount(key as `0x${string}`) }));

async function send(extra: Record<string, string> = {}) {
  const sig = await self.signRequest("POST", url, body);
  return fetch(url, { method: "POST", body, headers: { "content-type": "application/json", ...sig, ...extra } });
}

let res = await send();
if (res.status === 402) {
  console.log("402 Payment Required: paying the x402 offer fee...");
  const required = pay.getPaymentRequiredResponse((n) => res.headers.get(n), await res.clone().json().catch(() => undefined));
  const payload = await pay.createPaymentPayload(required);
  res = await send(pay.encodePaymentSignatureHeader(payload));
}
console.log(res.status, await res.text());
const receipt = res.headers.get("payment-response");
if (receipt) console.log("settlement:", Buffer.from(receipt, "base64").toString());
