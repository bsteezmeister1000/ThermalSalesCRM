import { describe, expect, it } from "vitest";

import { calculatePermitConfidence } from "@/lib/domain/confidence";

describe("calculatePermitConfidence", () => {
  it("penalizes pdf-only parses and rewards structured completeness", () => {
    expect(
      calculatePermitConfidence({
        hasPermitNumber: true,
        hasAddress: true,
        hasIssueDate: true,
        hasBuilder: false,
        parsedFromPdf: true
      })
    ).toBe(70);
  });
});
