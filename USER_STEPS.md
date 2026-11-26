# ERC-8004 registration (run it yourself)

Sends one tx from the agent wallet `0x4f92fdFbdC647c57B9A16bD78dA886F4FE9439a8` on Celo mainnet (42220),
tagged with the Loops House code `celo_28a711ea2d86`. Gas is about 0.04 CELO.

1. `git clone https://github.com/neqro/creator-deal-agent && cd creator-deal-agent`
2. `npm install` (Node 20+)
3. Create `.env` with one line: `OPERATOR_PRIVATE_KEY=0x...` (agent wallet key; never commit, never paste anywhere else)
4. Dry run, sends nothing: `npm run register:8004`
5. If it prints "Dry run OK": `npm run register:8004 -- --send`
6. It prints the tx hash and Agent ID and updates `agent/registration.json`. Push that file:
   `git add agent/registration.json && git commit -m "ERC-8004 agentId" && git push`
7. On Loops House: paste the tx hash next to "Verify", then press "Check on Celo".

The script refuses any key that is not the agent wallet and any chain other than 42220.
