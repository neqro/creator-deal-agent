import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { config } from "./config.js";

/**
 * Gate 2: verified brand agents pay a small fee per offer, over x402 on Celo.
 * The buyer signs an EIP-3009 authorization off-chain; the Celo facilitator
 * verifies, settles on-chain and pays the gas. Funds go straight to PAY_TO_ADDRESS.
 * Docs: https://docs.celo.org/build/agents/x402-add-celo
 */
const celoFacilitator = new HTTPFacilitatorClient({
  url: config.net.x402Facilitator,
  createAuthHeaders: async () => {
    const h = { "X-API-Key": config.x402ApiKey };
    return { verify: h, settle: h, supported: h };
  },
});

const server = new x402ResourceServer([celoFacilitator]).register(config.net.caip2, new ExactEvmScheme());

const offerFeeAccepts = config.net.feeTokens.map((t) => ({
  scheme: "exact" as const,
  network: config.net.caip2,
  payTo: config.payTo,
  price: { amount: config.offerFeeAtomic, asset: t.address, extra: { name: t.name, version: t.version } },
}));

export const routes: RoutesConfig = {
  "POST /offers": {
    accepts: offerFeeAccepts,
    description: "Send a collaboration offer to the creator's inbox (human-backed agents only)",
    mimeType: "application/json",
  },
};

/** Settles only when the handler answers < 400, so a rejected offer is not charged. */
export const offerPaywall = () => paymentMiddleware(routes, server);
