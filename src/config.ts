import "dotenv/config";

export type CeloNetwork = "mainnet" | "testnet";

/** Network facts, taken from the official docs (see ARCHITECTURE.md > Sources). */
export const NETWORKS = {
  mainnet: {
    chainId: 42220,
    caip2: "eip155:42220" as const,
    rpc: "https://forno.celo.org",
    x402Facilitator: "https://api.x402.celo.org",
    selfAgentRegistry: "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944",
    erc8004IdentityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    erc8004ReputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    // 6-decimal stablecoins accepted for the offer fee, with their EIP-712 domain on Celo.
    feeTokens: [
      { symbol: "USDT", address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", name: "Tether USD", version: "1" },
      { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", name: "USDC", version: "2" },
      { symbol: "USAT", address: "0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771", name: "Tether America USD", version: "1" },
    ],
  },
  testnet: {
    chainId: 11142220,
    caip2: "eip155:11142220" as const,
    rpc: "https://forno.celo-sepolia.celo-testnet.org",
    x402Facilitator: "https://api.x402.sepolia.celo.org",
    selfAgentRegistry: "0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379",
    erc8004IdentityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    erc8004ReputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    // TODO(day 2): add Celo Sepolia token addresses + EIP-712 domains from
    // https://docs.celo.org/build/agents/x402 (do not guess them).
    feeTokens: [] as { symbol: string; address: string; name: string; version: string }[],
  },
} as const;

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}

const network = env("CELO_NETWORK", "mainnet") as CeloNetwork;
if (network !== "mainnet" && network !== "testnet") {
  throw new Error(`CELO_NETWORK must be "mainnet" or "testnet", got "${network}"`);
}

export const config = {
  network,
  net: NETWORKS[network],
  port: Number(env("PORT", "3000")),
  publicUrl: env("PUBLIC_URL", "http://localhost:3000"),
  payTo: env("PAY_TO_ADDRESS", "0x0000000000000000000000000000000000000000"),
  offerFeeAtomic: env("OFFER_FEE_ATOMIC", "10000"),
  x402ApiKey: process.env.X402_API_KEY ?? "",
  selfSybilLimit: Number(env("SELF_SYBIL_LIMIT", "0")),
  selfRateLimitPerMinute: Number(env("SELF_RATE_LIMIT_PER_MINUTE", "10")),
  attributionCodes: env("ATTRIBUTION_CODES", "celo_28a711ea2d86,celo_4a75b42fc868")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
};
