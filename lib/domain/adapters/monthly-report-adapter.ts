import { normalizeAddress } from "@/lib/domain/normalization/address";
import { normalizeOrganizationName } from "@/lib/domain/normalization/organization";
import type { SourceAdapter } from "@/lib/domain/adapters/base";
import type {
  DiscoveredRecord,
  NormalizedPermitInput,
  RawDetail
} from "@/lib/domain/types";

type MonthlyReportRow = {
  permit_number: string;
  permit_type: string;
  work_class: string;
  issue_date: string;
  status: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  parcel_number?: string;
  project_name?: string;
  project_description?: string;
  valuation?: number;
  builder_name?: string;
  subdivision?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  assessor_url?: string;
};

type MonthlyReportAdapterOptions = {
  definition: SourceAdapter["definition"];
  fixtureRows: MonthlyReportRow[];
};

export class MonthlyReportAdapter implements SourceAdapter {
  definition;
  private fixtureRows: MonthlyReportRow[];

  constructor(options: MonthlyReportAdapterOptions) {
    this.definition = options.definition;
    this.fixtureRows = options.fixtureRows;
  }

  async fetchIndex(): Promise<DiscoveredRecord[]> {
    return this.fixtureRows.map((row) => ({
      sourceRecordKey: row.permit_number,
      title: `${row.permit_number} ${row.address}`,
      metadata: row as unknown as Record<string, unknown>
    }));
  }

  async fetchDetail(record: DiscoveredRecord): Promise<RawDetail> {
    return {
      sourceUrl: `${this.definition.key}://${record.sourceRecordKey}`,
      payload: (record.metadata ?? {}) as Record<string, unknown>,
      rawText: JSON.stringify(record.metadata)
    };
  }

  async parse(detail: RawDetail): Promise<NormalizedPermitInput[]> {
    const row = detail.payload as unknown as MonthlyReportRow;
    const address = normalizeAddress({
      address1: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip
    });

    const permit: NormalizedPermitInput = {
      normalizedKey: `${this.definition.key}:${row.permit_number}`,
      permitNumber: row.permit_number,
      permitType: row.permit_type,
      workClass: row.work_class,
      issueDate: new Date(row.issue_date),
      status: row.status,
      address1: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      parcelNumber: row.parcel_number,
      projectName: row.project_name,
      projectDescription: row.project_description,
      valuation: row.valuation,
      permitUrl: detail.sourceUrl,
      sourceConfidence: 78,
      provenance: {
        adapter: this.definition.key,
        lineage: "fixture_monthly_report",
        rawPermitNumber: row.permit_number
      },
      property: {
        normalizedAddressKey: address.normalizedKey,
        address1: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        parcelNumber: row.parcel_number,
        subdivision: row.subdivision,
        neighborhood: row.neighborhood,
        latitude: row.latitude,
        longitude: row.longitude,
        assessedValue: row.valuation ? row.valuation * 0.92 : undefined,
        landValue: row.valuation ? row.valuation * 0.22 : undefined,
        improvementValue: row.valuation ? row.valuation * 0.7 : undefined,
        dwellingType: row.work_class.toLowerCase().includes("single")
          ? "single_family"
          : "mixed",
        assessorUrl: row.assessor_url
      },
      organizations: row.builder_name
        ? [
            {
              name: row.builder_name,
              normalizedName: normalizeOrganizationName(row.builder_name),
              type: "builder",
              relationshipType: "builder",
              confidence: 82
            }
          ]
        : [],
      reviewFlags: row.builder_name
        ? [{ flag: "likely_good_lead", detail: "Builder found in source row." }]
        : [{ flag: "missing_builder", detail: "No builder found in source row." }]
    };

    return [permit];
  }

  async healthcheck() {
    return {
      status: "healthy",
      message: "Fixture-backed monthly report adapter is available.",
      supportsAutomation: true
    } as const;
  }
}
