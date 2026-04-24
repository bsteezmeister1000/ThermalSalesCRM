import { describe, expect, it } from "vitest";

import { getAdapters } from "@/lib/domain/adapters/registry";

describe("adapter workflow", () => {
  it("fetches fixture-backed records and normalizes them into permits", async () => {
    const adapter = getAdapters().find((item) => item.definition.key === "cedar-rapids-monthly-report");
    expect(adapter).toBeTruthy();

    const rawRecords = await adapter!.fetchSourceData();
    expect(rawRecords.length).toBeGreaterThan(0);

    const parsed = await adapter!.parseRawRecords(rawRecords);
    const normalized = await adapter!.normalizeRecords(parsed);

    expect(normalized.permits[0].normalizedKey).toContain("cedar-rapids-monthly-report");
    expect(normalized.permits[0].organizations?.[0]?.name).toBe("Hearthstone Homes LLC");
    expect(normalized.completeness.percentWithAddress).toBeGreaterThan(0);
  });
});
