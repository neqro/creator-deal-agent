import { describe, expect, it } from "vitest";
import { routes } from "../src/x402.js";
import { NETWORKS } from "../src/config.js";

describe("x402 offer fee", () => {
  it("prices POST /offers in every Celo fee token with its EIP-712 domain", () => {
    const accepts = (routes as Record<string, { accepts: unknown }>)["POST /offers"].accepts as Array<{ network: string; price: { asset: string; extra: object } }>;
    expect(accepts.map((a) => a.price.asset)).toEqual(NETWORKS.mainnet.feeTokens.map((t) => t.address));
    expect(accepts.every((a) => a.network === "eip155:42220")).toBe(true);
    expect(accepts.find((a) => a.price.asset === "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e")?.price.extra).toEqual({ name: "Tether USD", version: "1" });
  });

  it("has a Sepolia USDC for testing", () => {
    expect(NETWORKS.testnet.feeTokens[0].address).toBe("0x01C5C0122039549AD1493B8220cABEdD739BC44E");
  });
});
