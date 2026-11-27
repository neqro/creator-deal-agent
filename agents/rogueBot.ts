/**
 * Demo ROGUE bot: no Self Agent ID. Shows Gate 1 refusing it before it is ever asked to pay.
 *   SERVICE_URL=http://localhost:3000 npm run agent:rogue
 * Two attacks: (1) unsigned request, (2) signed by a random key that is not registered in Self.
 */
import "dotenv/config";
import { SelfAgent } from "@selfxyz/agent-sdk";
import { generatePrivateKey } from "viem/accounts";

const url = (process.env.SERVICE_URL ?? "http://localhost:3000").replace(/\/$/, "") + "/offers";
const body = JSON.stringify({ brand: "TotallyLegit Ltd", title: "Click here!!", message: "spam spam spam", budgetUsd: 1 });

const a = await fetch(url, { method: "POST", body, headers: { "content-type": "application/json" } });
console.log("unsigned bot  ->", a.status, await a.text());

const fake = new SelfAgent({ privateKey: generatePrivateKey(), network: "mainnet" });
const b = await fake.fetch(url, { method: "POST", body });
console.log("unregistered  ->", b.status, await b.text());
