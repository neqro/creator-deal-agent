import type { RequestHandler } from "express";
import { decodePaymentResponseHeader } from "@x402/core/http";
import type { Inbox } from "./store.js";

/**
 * Wraps Gate 1 so every refusal is recorded for the creator's dashboard
 * ("3 bot agents were turned away today"). The gate's own response is untouched.
 */
export function recordGate1(gate: RequestHandler, inbox: Inbox): RequestHandler {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const reason = String((res.locals as { gateError?: string }).gateError ?? "agent not verified");
        inbox.log("refused_unverified", reason);
      }
    });
    // Capture the JSON error the Self verifier sends, without changing it.
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 400 && body && typeof body === "object" && "error" in body) {
        res.locals.gateError = String((body as { error: unknown }).error);
      }
      return json(body);
    };
    return gate(req, res, next);
  };
}

/**
 * Wraps Gate 2: logs 402 challenges, and once the facilitator settled, stores the
 * settlement transaction on the offer (x402 sets PAYMENT-RESPONSE before the response flushes).
 */
export function recordGate2(gate: RequestHandler, inbox: Inbox): RequestHandler {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode === 402) {
        inbox.log("payment_required", "fee requested from verified agent");
        return;
      }
      const offerId = res.locals.offerId as string | undefined;
      const header = res.getHeader("PAYMENT-RESPONSE");
      if (!offerId || typeof header !== "string") return;
      try {
        const p = decodePaymentResponseHeader(header) as { transaction?: string; network?: string; payer?: string };
        if (p.transaction) {
          inbox.setPayment(offerId, { transaction: p.transaction, network: p.network, payer: p.payer });
          inbox.log("payment_settled", p.transaction, offerId);
        }
      } catch {
        /* malformed header: keep the offer, skip the receipt */
      }
    });
    return gate(req, res, next);
  };
}
