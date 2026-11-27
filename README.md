# Creator Deal Agent

**A creator inbox that only lets in brand agents with a real human behind them — and makes every offer cost a cent.**

Creators drown in fake "collab" DMs, scams and bot spam. As brands start sending AI agents to do
outreach, it gets worse: anyone can spin up a thousand agents. Creator Deal Agent puts two cheap,
on-chain gates in front of the inbox:

1. **Proof of human (Self Agent ID).** The brand agent must be registered to a real person via a
   zero-knowledge passport/ID proof. Bots and unverified agents get `401` before they can say a word.
2. **Skin in the game (x402 on Celo).** A verified agent pays a tiny fee (default 0.01 USDT) per
   offer, settled in stablecoins on Celo through the hosted x402 facilitator. Spam stops paying off.

Offers that pass both gates land in the creator's inbox, where they can accept or decline.

Built for Celo's **Agents Open for Business** hackathon — Track 3: Self Agent ID.

**Live demo:** https://neqro.github.io/creator-deal-agent/ (try every path of both gates in the browser, no wallet needed)

## Live on Celo mainnet (42220)

| What | Value |
|---|---|
| Agent wallet (service operator) | [`0x4f92fdFbdC647c57B9A16bD78dA886F4FE9439a8`](https://celoscan.io/address/0x4f92fdFbdC647c57B9A16bD78dA886F4FE9439a8) |
| ERC-8004 identity | agentId **10152** in the Identity Registry `0x8004A169…a432` · [registration tx](https://celoscan.io/tx/0x9fa273970008e1ae5e1b049fc78bff0ad322f2809350b89cdd2d75e4d69f3153) · [registration file](agent/registration.json) |
| Attribution tag | `celo_28a711ea2d86` (+ `celo_4a75b42fc868`), verified on the registration tx |
| Demo brand agent (Self Agent ID) | [`0xaC1cb112515c7B217C19b095C910676C48C426Ae`](https://celoscan.io/address/0xaC1cb112515c7B217C19b095C910676C48C426Ae), Self agentId **220**, `hasHumanProof` and `isProofFresh` = true (registry `0xaC3DF9AB…5944`) |

## How it works

```
Brand agent ──POST /offers (signed)──▶ Gate 1: Self Agent ID ──✗ 401 "not a human-backed agent"
                                        │ ✓
                                        ▼
                                       Gate 2: x402 ──402 Payment Required──▶ agent signs USDT payment
                                        │ ✓ paid (facilitator settles on Celo, pays gas)
                                        ▼
                                       Creator inbox ──▶ accept / decline
```

Full design, contract addresses and sources: [ARCHITECTURE.md](ARCHITECTURE.md).

### Self Agent ID check
`SelfAgentVerifier.auth()` from `@selfxyz/agent-sdk` verifies the request signature and reads the
Self Agent ID registry on Celo. An agent is accepted only if `hasHumanProof && isProofFresh`.
No API key, no call to a central server.

### x402 offer fee
`POST /offers` is priced with the x402 v2 Express middleware. It accepts USDT, USDC and USA₮ on
Celo mainnet (`eip155:42220`), settled by `https://api.x402.celo.org`. The brand agent needs no
CELO for gas, and a rejected (4xx) offer is never charged.

### ERC-8004
The service publishes an ERC-8004 registration file ([agent/registration.json](agent/registration.json))
and registers in the Celo Identity Registry (`0x8004A169…a432`), so other agents can discover it and
leave reputation feedback after a deal.

### Attribution tag
Every transaction the project sends is tagged with ERC-8021 via `@celo/attribution-tags`
(`withAttribution`), using the Loops House builder tag `celo_28a711ea2d86` plus the repo code `celo_4a75b42fc868`.

## Quick start

```bash
git clone https://github.com/neqro/creator-deal-agent.git
cd creator-deal-agent
npm install
cp .env.example .env      # fill PAY_TO_ADDRESS and X402_API_KEY
npm run dev
```

```bash
curl localhost:3000/health
# {"ok":true,"network":"mainnet","chainId":42220}

curl -X POST localhost:3000/offers -H 'content-type: application/json' \
  -d '{"brand":"Acme","title":"Reel collab","message":"Hi!"}'
# {"error":"Missing agent authentication headers"}   ← a bot is refused at Gate 1
```

## API

| Method & path | Who | What happens |
| --- | --- | --- |
| `POST /offers` | brand agent | Gate 1 (Self Agent ID, `401` if unverified) → Gate 2 (x402, `402` until paid) → `201 { offerId }`. Invalid body → `400`, not charged. |
| `GET /offers` | creator | Inbox, newest first, each offer with the verified agent (`agentId`, address) and the settlement tx. |
| `GET /offers/:id` | creator | One offer. |
| `PATCH /offers/:id` | creator | `{ "status": "accepted" \| "declined" }`. |
| `GET /activity` | creator | Counts and a feed of gate decisions: bots refused, fees requested, payments settled. |
| `GET /health` | anyone | Network, chain id, fee. |

Creator routes take `Authorization: Bearer $CREATOR_TOKEN`.

Offer body: `brand` (≤80), `title` (≤120), `message` (≤2000), `budgetUsd` (number, optional), `contact` (optional).

## Tests

```bash
npm test        # 21 tests: validation, both gates with mocks (bot refused, 402, no charge on 400, paid offer delivered), attribution, x402 pricing
npm run typecheck
```

Inspect the paywall without paying anything:

```bash
npx @celo/buy quote http://localhost:3000/offers --token USDT
```

## Stack

TypeScript · Node 20+ · Express 5 · `@selfxyz/agent-sdk` · `@x402/express` / `@x402/core` / `@x402/evm` ·
`@celo/attribution-tags` · viem · Vitest

## Roadmap

- [x] **Day 1** — docs research, architecture, TypeScript skeleton with both gates wired, README
- [x] **Day 2** — offer API (inbox, accept/decline, activity feed), settlement tx on each offer, 21 tests with mocked verifier and facilitator, Celo Sepolia USDC config
- [ ] **Day 3** — demo brand agent (verified, pays) + rogue bot agent (refused); creator inbox web UI
- [x] ERC-8004 registration (agentId 10152) and Self Agent ID for the demo brand agent (agentId 220)
- [ ] **Day 4** — ERC-8004 registration script, deploy to a public URL, persistent inbox
- [ ] **Day 5** — mainnet demo with real transactions, demo video, submission

Ideas after the hackathon: per-creator pricing, refunds on decline, brand reputation from
ERC-8004 feedback, credential filters (age, country) via Self.

## Security

No private keys or seed phrases in this repo. Secrets live in `.env` (git-ignored). Use fresh,
low-balance wallets for the operator and demo agents.

## License

MIT
