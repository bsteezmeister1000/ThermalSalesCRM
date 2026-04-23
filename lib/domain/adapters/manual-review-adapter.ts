import type { SourceAdapter } from "@/lib/domain/adapters/base";
import type { DiscoveredRecord, RawDetail } from "@/lib/domain/types";

export class ManualReviewAdapter implements SourceAdapter {
  definition;

  constructor(definition: SourceAdapter["definition"]) {
    this.definition = definition;
  }

  async fetchIndex(): Promise<DiscoveredRecord[]> {
    return [];
  }

  async fetchDetail(_record: DiscoveredRecord): Promise<RawDetail> {
    return {
      payload: {},
      rawText: undefined,
      sourceUrl: this.definition.description
    };
  }

  async parse() {
    return [];
  }

  async healthcheck() {
    return {
      status: "manual_review",
      message:
        "Public automation is not dependable here. Use CSV/XLSX import or saved URL review.",
      supportsAutomation: false
    } as const;
  }
}
