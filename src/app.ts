import express from "express";
import { requireHumanBackedAgent } from "./selfAgent.js";
import { offerPaywall } from "./x402.js";
import { offersRouter } from "./routes/offers.js";
import { config } from "./config.js";

export function createApp() {
  const app = express();

  // Self Agent ID signs the exact body bytes, so keep the raw body.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, network: config.network, chainId: config.net.chainId });
  });

  // Gate 1 runs before Gate 2: an unverified bot is refused before it is ever asked to pay.
  app.post("/offers", requireHumanBackedAgent());
  app.use(offerPaywall());
  app.use("/offers", offersRouter);

  return app;
}
