import type { SourceAdapter } from "@/lib/domain/adapters/base";
import type { ConnectorSyncResult, RawSourceRecord, SourceAdapterDefinition } from "@/lib/domain/types";

export class ManualReviewAdapter implements SourceAdapter {
  definition;

  constructor(definition: SourceAdapterDefinition) {
    this.definition = definition;
  }

  async fetchSourceData(): Promise<RawSourceRecord[]> {
    return [];
  }

  async parseRawRecords(rawRecords: RawSourceRecord[]): Promise<RawSourceRecord[]> {
    return rawRecords;
  }

  async normalizeRecords(parsedRecords: RawSourceRecord[]): Promise<ConnectorSyncResult> {
    return {
      rawRecords: parsedRecords,
      permits: [],
      organizations: [],
      parsingErrors: [],
      validationIssues: [],
      completeness: {
        totalRawRecords: parsedRecords.length,
        totalNormalizedRecords: 0,
        percentWithAddress: 0,
        percentWithPermitNumber: 0,
        percentWithIssueDate: 0,
        percentWithContractorBuilder: 0,
        percentWithOwner: 0,
        percentWithProjectValue: 0,
        percentWithDescription: 0,
        parseErrorRate: 0,
        duplicateRate: 0
      },
      sourceHealth: {
        status: "manual_review",
        message: "Public automation is not dependable here. Use CSV/XLSX import or saved URL review.",
        supportsAutomation: false,
        freshnessStatus: "unknown",
        sourceConfidence: 35
      },
      syncSummary: {
        mode: "manual_review"
      }
    };
  }

  async validateRecords(syncResult: ConnectorSyncResult): Promise<ConnectorSyncResult> {
    return syncResult;
  }

  async reportHealth(syncResult?: ConnectorSyncResult) {
    return (
      syncResult?.sourceHealth ?? {
        status: "manual_review",
        message: "Public automation is not dependable here. Use CSV/XLSX import or saved URL review.",
        supportsAutomation: false,
        freshnessStatus: "unknown",
        sourceConfidence: 35
      }
    );
  }
}
