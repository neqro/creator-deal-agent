import { describe, expect, it } from "vitest";
import { codeFromRepo } from "@celo/attribution-tags";
import { attributionCodes, attributionSuffix, LOOPS_CODE, REPO_CODE } from "../src/attribution.js";

describe("attribution", () => {
  it("derives the repo code the Celo Builders platform expects", () => {
    expect(codeFromRepo("neqro/creator-deal-agent")).toBe("celo_4a75b42fc868");
    expect(REPO_CODE).toBe("celo_4a75b42fc868");
  });

  it("puts the Loops House builder tag first and builds a suffix", () => {
    expect(attributionCodes[0]).toBe(LOOPS_CODE);
    expect(attributionCodes).toContain(REPO_CODE);
    expect(attributionSuffix).toMatch(/^0x[0-9a-f]+$/i);
  });
});
