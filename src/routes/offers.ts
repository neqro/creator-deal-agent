import { Router, type Request, type RequestHandler } from "express";
import type { Inbox, OfferStatus } from "../store.js";
import { parseOffer } from "../validate.js";

/** Set by SelfAgentVerifier.auth() on success. */
type VerifiedReq = Request & { agent?: { agentId: bigint | string; address: string } };

/** Creator side: Bearer CREATOR_TOKEN. With no token configured (local dev) it stays open. */
export function requireCreator(token: string): RequestHandler {
  return (req, res, next) => {
    if (!token) return next();
    if (req.get("authorization") === `Bearer ${token}`) return next();
    res.status(401).json({ error: "creator token required" });
  };
}

export function offersRouter(inbox: Inbox, creatorToken: string) {
  const r = Router();
  const creator = requireCreator(creatorToken);

  /** POST /offers: reached only after Gate 1 (Self Agent ID) and Gate 2 (x402 fee). */
  r.post("/", (req: VerifiedReq, res) => {
    const agent = req.agent;
    if (!agent) {
      // Defence in depth: never accept an offer the Self gate did not mark.
      res.status(401).json({ error: "agent not verified" });
      return;
    }
    const parsed = parseOffer(req.body);
    if (!parsed.ok) {
      // 4xx => the x402 middleware does not settle, so the agent is not charged.
      res.status(400).json({ error: parsed.error });
      return;
    }
    const offer = inbox.add({
      ...parsed.value,
      agent: { agentId: agent.agentId.toString(), address: agent.address },
    });
    res.locals.offerId = offer.id;
    inbox.log("offer_received", `${offer.brand}: ${offer.title}`, offer.id);
    res.status(201).json({ ok: true, offerId: offer.id, status: offer.status });
  });

  r.get("/", creator, (_req, res) => {
    res.json(inbox.list());
  });

  r.get("/:id", creator, (req, res) => {
    const o = inbox.get(String(req.params.id));
    if (!o) {
      res.status(404).json({ error: "offer not found" });
      return;
    }
    res.json(o);
  });

  /** Creator accepts or declines. PATCH is not a paid route, so x402 never touches it. */
  r.patch("/:id", creator, (req, res) => {
    const status = (req.body ?? {}).status as OfferStatus;
    if (status !== "accepted" && status !== "declined") {
      res.status(400).json({ error: 'status must be "accepted" or "declined"' });
      return;
    }
    const o = inbox.setStatus(String(req.params.id), status);
    if (!o) {
      res.status(404).json({ error: "offer not found" });
      return;
    }
    res.json(o);
  });

  return r;
}
