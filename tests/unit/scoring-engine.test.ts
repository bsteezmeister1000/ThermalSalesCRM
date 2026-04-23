import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { scoreLead } from "@/lib/domain/scoring/engine";

describe("scoreLead", () => {
  it("prioritizes new single family permits with strong valuation and freshness", () => {
    const result = scoreLead({
      permit: {
        permitType: "Building Permit",
        workClass: "New Single Family Dwelling",
        projectDescription: "New construction",
        issueDate: new Date(),
        valuation: new Prisma.Decimal(350000),
        status: "Issued",
        sourceConfidence: 78
      },
      builderActivePermitCount: 6,
      neighborhoodActivityCount: 3
    });

    expect(result.leadType).toBe("new_home");
    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect(result.reasons.map((reason) => reason.label)).toContain("New single family permit");
  });
});
