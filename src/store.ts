/** In-memory creator inbox + activity log. Swap for SQLite/KV before the public demo (day 4). */
export type OfferStatus = "new" | "accepted" | "declined";

export interface Offer {
  id: string;
  createdAt: string;
  brand: string;
  title: string;
  budgetUsd: number;
  message: string;
  contact?: string;
  status: OfferStatus;
  /** Self Agent ID facts of the sending agent, as verified on-chain. */
  agent: { agentId: string; address: string };
  /** x402 settlement, read from the PAYMENT-RESPONSE header after the facilitator settled. */
  payment?: { transaction: string; network?: string; payer?: string };
}

/** What the demo dashboard shows: who got in, who was turned away and why. */
export type ActivityKind = "refused_unverified" | "payment_required" | "offer_received" | "payment_settled";
export interface Activity {
  at: string;
  kind: ActivityKind;
  detail: string;
  offerId?: string;
}

export function createInbox() {
  const offers = new Map<string, Offer>();
  const activity: Activity[] = [];

  return {
    add(o: Omit<Offer, "id" | "createdAt" | "status">): Offer {
      const offer: Offer = { ...o, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "new" };
      offers.set(offer.id, offer);
      return offer;
    },
    get(id: string): Offer | undefined {
      return offers.get(id);
    },
    list(): Offer[] {
      return [...offers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    setStatus(id: string, status: OfferStatus): Offer | undefined {
      const o = offers.get(id);
      if (o) o.status = status;
      return o;
    },
    setPayment(id: string, payment: Offer["payment"]): void {
      const o = offers.get(id);
      if (o) o.payment = payment;
    },
    log(kind: ActivityKind, detail: string, offerId?: string): void {
      activity.unshift({ at: new Date().toISOString(), kind, detail, ...(offerId ? { offerId } : {}) });
      if (activity.length > 200) activity.length = 200;
    },
    activity(): Activity[] {
      return [...activity];
    },
    stats() {
      const count = (k: ActivityKind) => activity.filter((a) => a.kind === k).length;
      return {
        offers: offers.size,
        refusedUnverified: count("refused_unverified"),
        paymentRequired: count("payment_required"),
        paymentsSettled: count("payment_settled"),
      };
    },
  };
}

export type Inbox = ReturnType<typeof createInbox>;
