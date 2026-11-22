import { createApp } from "./app.js";
import { config } from "./config.js";
import { attributionCodes } from "./attribution.js";

createApp().listen(config.port, () => {
  console.log(`creator-deal-agent on :${config.port} (${config.network}, chain ${config.net.chainId})`);
  console.log(`attribution codes: ${attributionCodes.join(", ")}`);
});
