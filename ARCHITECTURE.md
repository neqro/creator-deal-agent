# Architecture

Creator Deal Agent is a small HTTP service that sits in front of a creator's inbox.
Brand agents (AI agents acting for a brand) send collaboration offers to it. Two gates
stand between a brand agent and the inbox:

1. **Gate 1 — Is a real human behind this agent?** (Self Agent ID)
2. **Gate 2 — Is the offer worth a cent?** (x402 fee in a stablecoin on Celo)

The service itself is discoverable and rateable as an ERC-8004 agent, and every
transaction it sends carries an ERC-8021 attribution tag.

```
 Brand agent (SelfAgent key)                  Creator Deal Agent (Express)                Celo
 ───────────────────────────                  ─────────────────────────────               ────
 POST /offers  + x-self-agent-* headers ───▶  Gate 1: SelfAgentVerifier.auth()  ──read──▶ Self Agent ID registry
                                              │  401 if unsigned / tampered /              (hasHumanProof && isProofFresh)
                                              │  replayed / no fresh human proof
                                              ▼
 ◀── 402 Payment Required (USDT/USDC/USA₮)    Gate 2: x402 paymentMiddleware
 sign EIP-3009 authorization (off-chain)      │
 POST /offers again + payment header  ───▶    │  /verify ───────────────────────────────▶ Celo x402 facilitator
                                              ▼                                           (api.x402.celo.org)
                                              offers handler → creator inbox
                                              │  status < 400 ⇒ /settle ────────────────▶ transferWithAuthorization
 ◀── 201 { offerId } + settlement tx          │  status ≥ 400 ⇒ no charge                  brand → creator, gas paid
                                                                                           by facilitator
 Creator UI ── GET /offers ───────────────▶   inbox (accept / decline)

 Operator scripts (viem + withAttribution) ─────────────────────────────────────────────▶ ERC-8004 Identity Registry
                                                                                           (register, setAgentURI)
```

## Components

| Path | Role |
| --- | --- |
| `src/app.ts` | Express app. Keeps the raw body (Self signs exact bytes), mounts Gate 1 before Gate 2. |
| `src/selfAgent.ts` | `SelfAgentVerifier` from `@selfxyz/agent-sdk`: network, sybil limit, rate limit. |
| `src/x402.ts` | `x402ResourceServer` + Celo `HTTPFacilitatorClient`; `POST /offers` priced in USDT, USDC and USA₮. |
| `src/attribution.ts` | `@celo/attribution-tags`: repo code, suffix, `withAttribution` viem extension. |
| `src/store.ts` | In-memory inbox (to be replaced by SQLite/KV for the public demo). |
| `src/routes/offers.ts` | `POST /offers` (brand agents), `GET /offers` (creator). |
| `agent/registration.json` | ERC-8004 registration file (template). |

## Gate 1: Self Agent ID

- A human registers the brand agent once by scanning a QR code in the Self app (passport/ID,
  zero-knowledge, no personal data on-chain). The registry mints a soulbound NFT binding the
  agent key to the human's nullifier.
- The brand agent signs every request with `SelfAgent.signRequest(method, url, body)`.
- The service runs `verifier.auth()`. It checks the signature, timestamp (5 min) and replay,
  then reads the registry on Celo. **Verified = `hasHumanProof && isProofFresh`.**
- Failures return `401` with a reason, e.g. `Missing agent authentication headers`,
  `Agent not verified on-chain`, `Replay detected`. The demo shows a bot being refused here.
- Policy: `sybilLimit(0)` (a brand may run several agents), `rateLimit({ perMinute: 10 })`.
  Optional later: `requireAge`, `requireOFAC`, `requireNationality`.
- Registries: mainnet `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` (chain 42220),
  Sepolia `0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379` (chain 11142220, mock passports only).

## Gate 2: x402 offer fee

- x402 v2 packages (`@x402/express`, `@x402/core`, `@x402/evm`) with the hosted Celo facilitator
  `https://api.x402.celo.org` (Sepolia: `https://api.x402.sepolia.celo.org`), API key in
  `X402_API_KEY` header `X-API-Key`.
- `POST /offers` is offered in three 6-decimal stablecoins on Celo mainnet, each with its own
  EIP-712 domain:
  - USDT `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` (`Tether USD`, v1)
  - USDC `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` (`USDC`, v2)
  - USA₮ `0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771` (`Tether America USD`, v1)
- Default fee: `10000` atomic = 0.01 of the token. The buyer needs no CELO; the facilitator pays gas
  and never holds funds (`transferWithAuthorization` moves tokens brand → creator).
- The middleware settles only when the handler returns `< 400`, so an invalid offer is not charged.
- Check without paying: `npx @celo/buy quote http://localhost:3000/offers --token USDT`.

## ERC-8004 identity

- The service registers itself in the ERC-8004 Identity Registry so other agents can find it and
  rate it in the Reputation Registry.
  - Mainnet: Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
  - Sepolia: Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Order: host `agent/registration.json` (with `x402Support: true`, no `registrations`) → `register(agentURI)`
  from the key that should own the identity → read `agentId` from the `Registered` event (not the
  simulated return value) → add it to `registrations` → `setAgentURI` if the URI changed.
- After a deal, brands can leave feedback (`giveFeedback`, tag `starred`); the owner cannot rate itself.
- Self Agent ID is itself an ERC-8004 deployment with a proof-of-human extension, so brand agents
  already hold an ERC-8004 identity.

## Attribution (ERC-8021)

- `@celo/attribution-tags`; repo code `codeFromRepo("neqro/creator-deal-agent") = celo_4a75b42fc868`.
- Every wallet client the project builds is extended with `withAttribution(codes)`, so the ERC-8004
  registration and any demo transaction are tagged from the very first tx.
- Loops House builder tag `celo_28a711ea2d86` (assigned at registration) is the first code in
  `ATTRIBUTION_CODES` (multi-code suffix); startup fails if it is missing, and `verifyTx` checks it
  after the first transaction.
- x402 settlements are sent by the facilitator, which tags them itself (Schema 2) once that ships.

## Security

- No keys in the repo: `.env` is git-ignored; `.env.example` lists names only.
- Operator and brand-agent keys are fresh, low-balance wallets, never a personal main wallet.
- Self replay protection and rate limits are in memory per process; run one instance for the demo.

## Sources

- Self Agent ID: https://docs.self.xyz/docs/agent-id/overview/ · quickstart · guides/service-operator
- ERC-8004 on Celo: https://docs.celo.org/build-on-celo/build-with-ai/8004
- x402 on Celo: https://docs.celo.org/build/agents/x402 · https://docs.celo.org/build/agents/x402-add-celo
- Attribution tags: https://github.com/celo-org/attribution-tags (BUILDERS.md)
