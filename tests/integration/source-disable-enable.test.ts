import { describe, expect, it } from "vitest";

import { getAdapters } from "@/lib/domain/adapters/registry";

describe("source enable/disable strategy", () => {
  it("marks unstable adapters as manual or partial manual instead of automated", () => {
    const adapters = getAdapters();
    const manual = adapters.filter((adapter) => adapter.definition.automationMode !== "automated");

    expect(manual.length).toBeGreaterThan(0);
  });
});
