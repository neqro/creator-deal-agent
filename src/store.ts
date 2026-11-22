/** In-memory creator inbox. Swap for SQLite/KV before the public demo (day 4). */
export type OfferStatus = "new" | "accepted" | "declined";

export interface Offer {
  id: string;
  createdAt: string;
  brand: string;
  title: string;
  budgetUsd: number;
  message: string;
  status: OfferStatus;
  /** Self Agent ID facts of the sending agent, as verified on-chain. */
  agent: { agentId: string; address: string };
  /** x402 settlement transaction, when the facilitator returned one. */
  paymentTx?: string;
}

const offers = new Map<string, Offer>();

export const inbox = {
  add(o: Omit<Offer, "id" | "createdAt" | "status">): Offer {
    const offer: Offer = { ...o, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "new" };
    offers.set(offer.id, offer);
    return offer;
  },
  list(): Offer[] {
    return [...offers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  setStatus(id: string, status: OfferStatus): Offer | undefined {
    const o = offers.get(id);
    if (o) o.status = status;
    return o;
  },
};
