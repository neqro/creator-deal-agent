import { codeFromRepo, toDataSuffix, withAttribution } from "@celo/attribution-tags";
import { config } from "./config.js";

/**
 * ERC-8021 attribution for every transaction this project sends itself
 * (ERC-8004 registration, reputation feedback, demo transfers).
 * x402 settlements are submitted by the facilitator, which tags them on its side.
 * Docs: https://github.com/celo-org/attribution-tags/blob/main/BUILDERS.md
 */
export const REPO_SLUG = "neqro/creator-deal-agent";
export const REPO_CODE = codeFromRepo(REPO_SLUG); // celo_4a75b42fc868

export const attributionCodes = config.attributionCodes.length ? config.attributionCodes : [REPO_CODE];

if (!attributionCodes.includes(REPO_CODE)) {
  console.warn(`[attribution] ${REPO_CODE} (derived from ${REPO_SLUG}) is not in ATTRIBUTION_CODES`);
}

/** Raw suffix, for call sites that build calldata by hand. */
export const attributionSuffix = toDataSuffix(attributionCodes);

/** viem wallet-client extension: walletClient.extend(attributed()) tags every tx. */
export const attributed = () => withAttribution(attributionCodes);
