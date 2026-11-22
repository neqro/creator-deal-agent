import { Router, type Request } from "express";
import { inbox } from "../store.js";

export const offersRouter = Router();

interface OfferBody {
  brand?: unknown;
  title?: unknown;
  budgetUsd?: unknown;
  message?: unknown;
}

/** Set by SelfAgentVerifier.auth() on success. */
type VerifiedReq = Request & { agent?: { agentId: bigint | string; address: string } };

/** POST /offers: reached only after Gate 1 (Self Agent ID) and Gate 2 (x402 fee). */
offersRouter.post("/", (req: VerifiedReq, res) => {
  const b = (req.body ?? {}) as OfferBody;
  if (typeof b.brand !== "string" || typeof b.title !== "string" || typeof b.message !== "string") {
    // 4xx => the x402 middleware does not settle, so the agent is not charged.
    res.status(400).json({ error: "brand, title and message are required strings" });
    return;
  }
  const agent = req.agent!;
  const offer = inbox.add({
    brand: b.brand.slice(0, 80),
    title: b.title.slice(0, 120),
    message: b.message.slice(0, 2000),
    budgetUsd: Number(b.budgetUsd) || 0,
    agent: { agentId: agent.agentId.toString(), address: agent.address },
  });
  res.status(201).json({ ok: true, offerId: offer.id });
});

/** Creator side (demo: no auth yet; day 3 adds a simple creator token). */
offersRouter.get("/", (_req, res) => {
  res.json(inbox.list());
});
