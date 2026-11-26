/**
 * Register Creator Deal Agent in the ERC-8004 Identity Registry on Celo mainnet (42220),
 * from the dedicated agent wallet, with the Loops House attribution tag on the tx.
 *
 *   npm run register:8004            # dry run: checks wallet, balance, gas, tag. Sends nothing.
 *   npm run register:8004 -- --send  # sends the registration tx
 *
 * Needs OPERATOR_PRIVATE_KEY in .env (local only, never commit).
 * Docs: https://docs.celo.org/build-on-celo/build-with-ai/8004
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, encodeFunctionData, formatEther, http, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { toDataSuffix, verifyTx, withAttribution } from "@celo/attribution-tags";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
/** The one agent wallet on file at Loops House. The script refuses any other key. */
const AGENT_WALLET = "0x4f92fdFbdC647c57B9A16bD78dA886F4FE9439a8";
const LOOPS_CODE = "celo_28a711ea2d86";
const REPO_CODE = "celo_4a75b42fc868";
const AGENT_URI =
  process.env.AGENT_URI ?? "https://raw.githubusercontent.com/neqro/creator-deal-agent/main/agent/registration.json";
const REG_FILE = new URL("../agent/registration.json", import.meta.url);

const abi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

const send = process.argv.includes("--send");
const codes = (process.env.ATTRIBUTION_CODES ?? `${LOOPS_CODE},${REPO_CODE}`)
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
if (codes[0] !== LOOPS_CODE) throw new Error(`ATTRIBUTION_CODES must start with ${LOOPS_CODE}`);

const key = process.env.OPERATOR_PRIVATE_KEY?.trim();
if (!key) throw new Error("OPERATOR_PRIVATE_KEY is empty. Put the agent wallet key in .env (local only).");
const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
if (account.address.toLowerCase() !== AGENT_WALLET.toLowerCase()) {
  throw new Error(`Key belongs to ${account.address}, not the agent wallet ${AGENT_WALLET}. Refusing.`);
}

const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
const wallet = createWalletClient({ account, chain: celo, transport: http("https://forno.celo.org") }).extend(
  withAttribution(codes),
);

const chainId = await publicClient.getChainId();
if (chainId !== 42220) throw new Error(`Connected to chain ${chainId}, expected Celo mainnet 42220`);

const [balance, nonce, gasPrice] = await Promise.all([
  publicClient.getBalance({ address: account.address }),
  publicClient.getTransactionCount({ address: account.address }),
  publicClient.getGasPrice(),
]);
const callData = encodeFunctionData({ abi, functionName: "register", args: [AGENT_URI] });
const suffix = toDataSuffix(codes);
const gas = await publicClient.estimateGas({ account, to: IDENTITY_REGISTRY, data: `${callData}${suffix.slice(2)}` });
const maxCost = gas * gasPrice;

console.log("Network     : Celo mainnet (42220)");
console.log("From        :", account.address, `(nonce ${nonce})`);
console.log("Registry    :", IDENTITY_REGISTRY);
console.log("Agent URI   :", AGENT_URI);
console.log("Tags        :", codes.join(", "));
console.log("Balance     :", formatEther(balance), "CELO");
console.log("Gas estimate:", gas.toString(), "units, about", formatEther(maxCost), "CELO");
if (balance < maxCost * 2n) throw new Error("Balance too low for gas.");

if (!send) {
  console.log("\nDry run OK. Nothing sent. Run again with --send to register.");
  process.exit(0);
}

const hash = await wallet.writeContract({ address: IDENTITY_REGISTRY, abi, functionName: "register", args: [AGENT_URI] });
console.log("\nTx sent:", hash);
console.log("Celoscan:", `https://celoscan.io/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error("Tx reverted");

const [registered] = parseEventLogs({ abi, eventName: "Registered", logs: receipt.logs });
const agentId = registered.args.agentId;
const tag = await verifyTx({ client: publicClient, hash });
console.log("Agent ID    :", agentId.toString());
console.log("Tag on tx   :", tag ? tag.codes.join(", ") : "NOT FOUND");

const reg = JSON.parse(readFileSync(REG_FILE, "utf8"));
reg.registrations = [{ agentId: Number(agentId), agentRegistry: `eip155:42220:${IDENTITY_REGISTRY}` }];
writeFileSync(REG_FILE, JSON.stringify(reg, null, 2) + "\n");
console.log("\nagent/registration.json updated with agentId. Commit and push it:");
console.log('  git add agent/registration.json && git commit -m "ERC-8004 agentId" && git push');
