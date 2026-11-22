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
(`withAttribution`), using the repo code `celo_4a75b42fc868`.

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

Inspect the paywall without paying anything:

```bash
npx @celo/buy quote http://localhost:3000/offers --token USDT
```

## Stack

TypeScript · Node 20+ · Express 5 · `@selfxyz/agent-sdk` · `@x402/express` / `@x402/core` / `@x402/evm` ·
`@celo/attribution-tags` · viem · Vitest

## Roadmap

- [x] **Day 1** — docs research, architecture, TypeScript skeleton with both gates wired, README
- [ ] **Day 2** — offer API hardening, tests with mocked verifier and facilitator, attribution wiring in scripts
- [ ] **Day 3** — demo brand agent (verified, pays) + rogue bot agent (refused); creator inbox web UI
- [ ] **Day 4** — ERC-8004 registration script, deploy to a public URL, persistent inbox
- [ ] **Day 5** — mainnet demo with real transactions, demo video, submission

Ideas after the hackathon: per-creator pricing, refunds on decline, brand reputation from
ERC-8004 feedback, credential filters (age, country) via Self.

## Security

No private keys or seed phrases in this repo. Secrets live in `.env` (git-ignored). Use fresh,
low-balance wallets for the operator and demo agents.

## License

MIT
