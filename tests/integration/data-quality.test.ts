import { describe, expect, it } from "vitest";

import { cedarRapidsMonthlyPermitFixture } from "@/lib/domain/adapters/fixtures/cedar-rapids-monthly-report";

describe("data quality fixtures", () => {
  it("fixture rows contain required normalized permit fields", () => {
    for (const row of cedarRapidsMonthlyPermitFixture) {
      expect(row.permit_number).toBeTruthy();
      expect(row.address).toBeTruthy();
      expect(row.issue_date).toBeTruthy();
    }
  });
});
