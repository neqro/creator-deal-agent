# Deploy (free host, e.g. Render / Railway / Fly)

1. New web service from github.com/neqro/creator-deal-agent. Build: `npm ci`. Start: `npx tsx src/server.ts`.
2. Env vars (set in the host dashboard, never in git): `PAY_TO_ADDRESS=0x4f92fdFbdC647c57B9A16bD78dA886F4FE9439a8`, `X402_API_KEY`, `CREATOR_TOKEN` (long random), `SERVICE_URL` (public https URL), optional `DATA_FILE=./data/inbox.json` (free hosts wipe disk on redeploy; fine for a demo).
3. Open `/health`, then `/inbox` and paste CREATOR_TOKEN.
4. Point the brand agent at it: `SERVICE_URL=https://your-host npm run agent:brand`.
