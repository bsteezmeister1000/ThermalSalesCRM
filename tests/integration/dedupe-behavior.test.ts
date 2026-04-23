import { describe, expect, it } from "vitest";

import { dedupeRecords } from "@/lib/domain/ingestion/dedupe";

describe("dedupeRecords", () => {
  it("dedupes identical source key/hash pairs but keeps changed variants", () => {
    const results = dedupeRecords([
      { key: "A", canonicalHash: "1" },
      { key: "A", canonicalHash: "1" },
      { key: "A", canonicalHash: "2" }
    ]);

    expect(results).toHaveLength(2);
  });
});
