import { SelfAgentVerifier } from "@selfxyz/agent-sdk";
import { config } from "./config.js";

/**
 * Gate 1: only human-backed agents get in.
 * The verifier checks the request signature (x-self-agent-* headers) and reads the
 * Self Agent ID registry on Celo: an agent passes when hasHumanProof && isProofFresh.
 * No API key, no call to Self's servers.
 * Docs: https://docs.self.xyz/docs/agent-id/guides/service-operator/
 */
export const selfVerifier = SelfAgentVerifier.create()
  .network(config.network)
  .sybilLimit(config.selfSybilLimit)
  .rateLimit({ perMinute: config.selfRateLimitPerMinute })
  .build();

/** Express middleware: 401 for unsigned, tampered, replayed or unverified agents. */
export const requireHumanBackedAgent = () => selfVerifier.auth();
