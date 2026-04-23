import { describe, expect, it } from "vitest";

import { normalizeAddress } from "@/lib/domain/normalization/address";

describe("normalizeAddress", () => {
  it("normalizes street suffixes and directionals into a stable key", () => {
    const result = normalizeAddress({
      address1: "4102 Prairie Vista Drive Northeast",
      city: "Cedar Rapids",
      state: "ia",
      zip: "52402-1234"
    });

    expect(result.normalizedKey).toBe("4102 prairie vista dr ne|cedar rapids|IA|52402");
  });
});
