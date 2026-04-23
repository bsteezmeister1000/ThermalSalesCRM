import { describe, expect, it } from "vitest";

import { getAdapters } from "@/lib/domain/adapters/registry";

describe("adapter workflow", () => {
  it("fetches fixture-backed index records and parses them into normalized permits", async () => {
    const adapter = getAdapters().find((item) => item.definition.key === "cedar-rapids-monthly-report");
    expect(adapter).toBeTruthy();

    const index = await adapter!.fetchIndex();
    expect(index.length).toBeGreaterThan(0);

    const detail = await adapter!.fetchDetail!(index[0]);
    const permits = await adapter!.parse(detail, index[0]);

    expect(permits[0].normalizedKey).toContain("cedar-rapids-monthly-report");
    expect(permits[0].organizations?.[0]?.name).toBe("Hearthstone Homes LLC");
  });
});
