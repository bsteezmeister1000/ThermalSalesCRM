import { describe, expect, it } from "vitest";

import { classifyLeadType } from "@/lib/domain/classification";

describe("classifyLeadType", () => {
  it("detects retrofit-adjacent exterior work", () => {
    expect(
      classifyLeadType({
        permitType: "Building Permit",
        workClass: "Roof / Siding",
        description: "Siding replacement"
      })
    ).toBe("retrofit_adjacent");
  });
});
