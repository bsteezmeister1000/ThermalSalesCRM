import { describe, expect, it } from "vitest";

import { detectChangedFields } from "@/lib/domain/ingestion/change-detection";

describe("detectChangedFields", () => {
  it("surfaces changed fields for permit updates", () => {
    const result = detectChangedFields(
      { status: "Issued", valuation: 100000 },
      { status: "Closed", valuation: 100000 }
    );

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toEqual(["status"]);
  });
});
