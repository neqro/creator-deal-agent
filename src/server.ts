import { createApp } from "./app.js";
import { config } from "./config.js";
import { attributionCodes } from "./attribution.js";
import { requireHumanBackedAgent } from "./selfAgent.js";
import { offerPaywall } from "./x402.js";

if (!config.creatorToken) console.warn("CREATOR_TOKEN is empty: the inbox is readable by anyone (dev only)");

const { app } = createApp({
  gate1: requireHumanBackedAgent(),
  gate2: offerPaywall(),
  creatorToken: config.creatorToken,
  info: { network: config.network, chainId: config.net.chainId, feeAtomic: config.offerFeeAtomic },
});

app.listen(config.port, () => {
  console.log(`creator-deal-agent on :${config.port} (${config.network}, chain ${config.net.chainId})`);
  console.log(`attribution codes: ${attributionCodes.join(", ")}`);
});
