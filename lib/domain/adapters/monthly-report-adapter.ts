import { normalizeAddress } from "@/lib/domain/normalization/address";
import { normalizeOrganizationName } from "@/lib/domain/normalization/organization";
import type { SourceAdapter } from "@/lib/domain/adapters/base";
import type {
  ConnectorSyncResult,
  NormalizedPermitInput,
  RawSourceRecord,
  SourceAdapterDefinition
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
  definition: SourceAdapterDefinition;
  fixtureRows: MonthlyReportRow[];
};

export class MonthlyReportAdapter implements SourceAdapter {
  definition;
  private fixtureRows: MonthlyReportRow[];

  constructor(options: MonthlyReportAdapterOptions) {
    this.definition = options.definition;
    this.fixtureRows = options.fixtureRows;
  }

  async fetchSourceData(): Promise<RawSourceRecord[]> {
    return this.fixtureRows.map((row) => ({
      sourceRecordKey: row.permit_number,
      sourceUrl: this.definition.baseUrl,
      payload: row as unknown as Record<string, unknown>,
      rawText: JSON.stringify(row),
      contentType: "application/json",
      dataOrigin: "fixture"
    }));
  }

  async parseRawRecords(rawRecords: RawSourceRecord[]): Promise<RawSourceRecord[]> {
    return rawRecords;
  }

  async normalizeRecords(parsedRecords: RawSourceRecord[]): Promise<ConnectorSyncResult> {
    const permits: NormalizedPermitInput[] = parsedRecords.map((record) => {
      const row = record.payload as unknown as MonthlyReportRow;
      const address = normalizeAddress({
        address1: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip
      });

      return {
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
        permitUrl: record.sourceUrl,
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
          dwellingType: row.work_class.toLowerCase().includes("single") ? "single_family" : "mixed",
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
    });

    const total = parsedRecords.length || 1;

    return {
      rawRecords: parsedRecords,
      permits,
      organizations: [],
      parsingErrors: [],
      validationIssues: [],
      completeness: {
        totalRawRecords: parsedRecords.length,
        totalNormalizedRecords: permits.length,
        percentWithAddress: Math.round((permits.filter((permit) => permit.address1).length / total) * 100),
        percentWithPermitNumber: Math.round((permits.filter((permit) => permit.permitNumber).length / total) * 100),
        percentWithIssueDate: Math.round((permits.filter((permit) => permit.issueDate).length / total) * 100),
        percentWithContractorBuilder: Math.round(
          (permits.filter((permit) => (permit.organizations?.length ?? 0) > 0).length / total) * 100
        ),
        percentWithOwner: 0,
        percentWithProjectValue: Math.round((permits.filter((permit) => permit.valuation != null).length / total) * 100),
        percentWithDescription: Math.round(
          (permits.filter((permit) => permit.projectDescription || permit.projectName).length / total) * 100
        ),
        parseErrorRate: 0,
        duplicateRate: 0
      },
      sourceHealth: {
        status: "healthy",
        message: "Fixture-backed monthly report adapter is available.",
        supportsAutomation: true,
        freshnessStatus: "aging",
        sourceConfidence: 78
      },
      syncSummary: {
        mode: "fixture",
        permits: permits.length
      }
    };
  }

  async validateRecords(syncResult: ConnectorSyncResult): Promise<ConnectorSyncResult> {
    return syncResult;
  }

  async reportHealth(syncResult?: ConnectorSyncResult) {
    return (
      syncResult?.sourceHealth ?? {
        status: "healthy",
        message: "Fixture-backed monthly report adapter is available.",
        supportsAutomation: true,
        freshnessStatus: "aging",
        sourceConfidence: 78
      }
    );
  }
}
