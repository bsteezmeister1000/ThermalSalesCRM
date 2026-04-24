import type {
  ConnectorSyncResult,
  RawSourceRecord,
  SourceAdapterDefinition,
  SourceHealth
} from "@/lib/domain/types";

export interface SourceAdapter {
  definition: SourceAdapterDefinition;
  fetchSourceData(): Promise<RawSourceRecord[]>;
  parseRawRecords(rawRecords: RawSourceRecord[]): Promise<RawSourceRecord[]>;
  normalizeRecords(parsedRecords: RawSourceRecord[]): Promise<ConnectorSyncResult>;
  validateRecords(syncResult: ConnectorSyncResult): Promise<ConnectorSyncResult>;
  upsertRecords?(syncResult: ConnectorSyncResult): Promise<void>;
  reportHealth(syncResult?: ConnectorSyncResult): Promise<SourceHealth>;
}
