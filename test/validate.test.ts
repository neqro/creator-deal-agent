import { describe, expect, it } from "vitest";
import { parseOffer, LIMITS } from "../src/validate.js";

describe("parseOffer", () => {
  const good = { brand: "Acme", title: "Reel collab", message: "One reel in December", budgetUsd: 250 };

  it("accepts a valid offer and trims strings", () => {
    const r = parseOffer({ ...good, brand: "  Acme  " });
    expect(r).toEqual({ ok: true, value: { ...good, brand: "Acme" } });
  });

  it.each([
    [null, "body must be a JSON object"],
    [[], "body must be a JSON object"],
    [{ ...good, brand: undefined }, "brand is required"],
    [{ ...good, title: 42 }, "title must be a string"],
    [{ ...good, message: "   " }, "message is required"],
    [{ ...good, budgetUsd: -1 }, "budgetUsd must be a number"],
    [{ ...good, budgetUsd: "abc" }, "budgetUsd must be a number"],
    [{ ...good, message: "x".repeat(LIMITS.message + 1) }, "message must be at most"],
  ])("rejects %j", (body, err) => {
    const r = parseOffer(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(err);
  });
});
