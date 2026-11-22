import { describe, expect, it } from "vitest";
import { codeFromRepo } from "@celo/attribution-tags";

describe("attribution", () => {
  it("derives the repo code the Celo Builders platform expects", () => {
    expect(codeFromRepo("neqro/creator-deal-agent")).toBe("celo_4a75b42fc868");
  });
});
