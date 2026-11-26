import express, { type RequestHandler } from "express";
import { offersRouter, requireCreator } from "./routes/offers.js";
import { createInbox, type Inbox } from "./store.js";
import { recordGate1, recordGate2 } from "./activity.js";

export interface AppDeps {
  /** Gate 1: Self Agent ID verifier middleware (real one in server.ts, a fake in tests). */
  gate1: RequestHandler;
  /** Gate 2: x402 payment middleware. */
  gate2: RequestHandler;
  inbox?: Inbox;
  creatorToken?: string;
  info?: Record<string, unknown>;
}

export function createApp(deps: AppDeps) {
  const inbox = deps.inbox ?? createInbox();
  const app = express();

  // Self Agent ID signs the exact body bytes, so keep the raw body.
  app.use(
    express.json({
      limit: "16kb",
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ...(deps.info ?? {}) });
  });

  // Gate 1 runs before Gate 2: an unverified bot is refused before it is ever asked to pay.
  app.post("/offers", recordGate1(deps.gate1, inbox));
  app.use(recordGate2(deps.gate2, inbox));
  app.use("/offers", offersRouter(inbox, deps.creatorToken ?? ""));

  // Creator dashboard data: counts + recent gate decisions.
  app.get("/activity", requireCreator(deps.creatorToken ?? ""), (_req, res) => {
    res.json({ stats: inbox.stats(), recent: inbox.activity().slice(0, 50) });
  });

  return { app, inbox };
}
