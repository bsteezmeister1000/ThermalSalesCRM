import { describe, expect, it } from "vitest";

import { normalizeOrganizationName, organizationAliases } from "@/lib/domain/normalization/organization";

describe("organization normalization", () => {
  it("removes noise words and punctuation", () => {
    expect(normalizeOrganizationName("Hearthstone Homes, LLC")).toBe("hearthstone homes");
  });

  it("generates stable aliases", () => {
    expect(organizationAliases("A & B Builders Inc.")).toContain("a and b builders");
  });
});
