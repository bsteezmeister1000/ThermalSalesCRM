import type {
  DiscoveredRecord,
  NormalizedPermitInput,
  RawDetail,
  SourceAdapterDefinition,
  SourceHealth
} from "@/lib/domain/types";

export interface SourceAdapter {
  definition: SourceAdapterDefinition;
  fetchIndex(): Promise<DiscoveredRecord[]>;
  fetchDetail?(record: DiscoveredRecord): Promise<RawDetail>;
  parse(detail: RawDetail, record?: DiscoveredRecord): Promise<NormalizedPermitInput[]>;
  healthcheck(): Promise<SourceHealth>;
}
