import type {
  HealthStatus,
  LeadStatus,
  LeadType,
  OrganizationType,
  ParseStatus,
  RelationshipType,
  SourceType
} from "@prisma/client";

export type DiscoveredRecord = {
  sourceRecordKey: string;
  indexUrl?: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

export type RawDetail = {
  sourceUrl?: string;
  payload: Record<string, unknown>;
  rawText?: string;
};

export type NormalizedPermitInput = {
  normalizedKey: string;
  permitNumber?: string;
  permitType?: string;
  workClass?: string;
  issueDate?: Date;
  applicationDate?: Date;
  status?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  parcelNumber?: string;
  projectName?: string;
  projectDescription?: string;
  valuation?: number;
  permitUrl?: string;
  sourceConfidence: number;
  provenance: Record<string, unknown>;
  property?: {
    normalizedAddressKey: string;
    address1: string;
    city: string;
    state: string;
    zip?: string;
    parcelNumber?: string;
    subdivision?: string;
    neighborhood?: string;
    assessedValue?: number;
    landValue?: number;
    improvementValue?: number;
    yearBuilt?: number;
    dwellingType?: string;
    assessorUrl?: string;
  };
  organizations?: Array<{
    name: string;
    normalizedName: string;
    type: OrganizationType;
    relationshipType: RelationshipType;
    confidence: number;
    contacts?: Array<{
      fullName: string;
      firstName?: string;
      lastName?: string;
      roleTitle?: string;
      email?: string;
      phone?: string;
      source?: string;
      sourceUrl?: string;
      provenance?: Record<string, unknown>;
      confidence?: number;
    }>;
  }>;
  reviewFlags?: Array<{
    flag:
      | "possible_duplicate"
      | "parse_uncertainty"
      | "irrelevant_permit"
      | "missing_builder"
      | "missing_contact"
      | "likely_good_lead"
      | "stale";
    detail?: string;
  }>;
};

export type SourceHealth = {
  status: HealthStatus;
  message: string;
  supportsAutomation: boolean;
};

export type SourceAdapterDefinition = {
  key: string;
  name: string;
  jurisdiction: string;
  type: SourceType;
  description: string;
  automationMode: "automated" | "partial_manual" | "manual_review";
  crawlFrequencyMinutes?: number;
};

export type ScoreReason = {
  label: string;
  weight: number;
  detail?: string;
};

export type ScoreBreakdown = {
  leadType: LeadType;
  insulationFitScore: number;
  revenuePotentialScore: number;
  relationshipScore: number;
  freshnessScore: number;
  overallScore: number;
  recommendedAction: string;
  reasons: ScoreReason[];
};

export type LeadQueueFilters = {
  city?: string;
  jurisdiction?: string;
  permitType?: string;
  leadType?: LeadType | "";
  minScore?: number;
  maxScore?: number;
  issueDateFrom?: string;
  issueDateTo?: string;
  sourceId?: string;
  status?: LeadStatus | "";
  organization?: string;
  query?: string;
  sort?:
    | "newest"
    | "highest_score"
    | "valuation"
    | "builder_momentum"
    | "recently_changed";
};

export type IngestionResult = {
  sourceId: string;
  discovered: number;
  rawRecordsWritten: number;
  permitsUpserted: number;
  leadsUpserted: number;
  errors: string[];
};

export type RecordParseOutcome = {
  status: ParseStatus;
  errors?: string;
};
