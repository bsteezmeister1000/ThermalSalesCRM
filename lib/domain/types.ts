import type {
  AccessMethod,
  ActiveStatus,
  DataOrigin,
  FreshnessStatus,
  HealthStatus,
  IngestionMethod,
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
  contentType?: string;
  sourceUpdatedAt?: Date;
  dataOrigin?: DataOrigin;
};

export type RawSourceRecord = {
  sourceRecordKey: string;
  payload: Record<string, unknown>;
  rawText?: string;
  sourceUrl?: string;
  contentType?: string;
  sourceUpdatedAt?: Date;
  dataOrigin?: DataOrigin;
};

export type CompletenessStats = {
  totalRawRecords: number;
  totalNormalizedRecords: number;
  percentWithAddress: number;
  percentWithPermitNumber: number;
  percentWithIssueDate: number;
  percentWithContractorBuilder: number;
  percentWithOwner: number;
  percentWithProjectValue: number;
  percentWithDescription: number;
  parseErrorRate: number;
  duplicateRate: number;
};

export type SourceHealth = {
  status: HealthStatus;
  message: string;
  supportsAutomation: boolean;
  freshnessStatus?: FreshnessStatus;
  sourceConfidence?: number;
};

export type SourceAdapterDefinition = {
  key: string;
  name: string;
  jurisdiction: string;
  type: SourceType;
  accessMethod: AccessMethod;
  baseUrl: string;
  description: string;
  automationMode: "automated" | "partial_manual" | "manual_review";
  activeStatus?: ActiveStatus;
  parserName?: string;
  parserVersion?: string;
  expectedUpdateFrequencyHours?: number;
  expectedFields?: string[];
  notes?: string;
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
    latitude?: number;
    longitude?: number;
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

export type NormalizedOrganizationInput = {
  sourceRecordKey: string;
  rawCompanyName: string;
  normalizedCompanyName: string;
  organizationType: OrganizationType;
  sourceConfidence: number;
  ingestionMethod: IngestionMethod;
  dataOrigin?: DataOrigin;
  sourceUrl?: string;
  serviceArea?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  provenance: Record<string, unknown>;
  contactMethods?: Array<{
    type: "phone" | "email" | "website";
    value: string;
    normalizedValue?: string;
    verificationStatus: "verified" | "inferred" | "manual";
    confidence: number;
    source?: string;
    sourceUrl?: string;
  }>;
};

export type ValidationIssue = {
  code: string;
  level: "warning" | "error";
  message: string;
  sourceRecordKey?: string;
};

export type SourceSyncPayload = {
  rawRecords: RawSourceRecord[];
  permits: NormalizedPermitInput[];
  organizations: NormalizedOrganizationInput[];
  parsingErrors: ValidationIssue[];
  validationIssues: ValidationIssue[];
  completeness: CompletenessStats;
  sourceHealth: SourceHealth;
};

export type ConnectorSyncResult = SourceSyncPayload & {
  syncSummary: Record<string, unknown>;
};

export type PermitListFilters = {
  query?: string;
  city?: string;
  permitType?: string;
  status?: string;
  sourceId?: string;
  leadStatus?: LeadStatus | "";
  radiusMode?: "verified_or_approx" | "verified_only";
  sort?: "newest" | "oldest" | "highest_value" | "priority" | "recently_seen";
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
  view?: "all" | "review_now" | "qualified_pipeline" | "follow_up" | "recent" | "high_priority";
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
  organizationsUpserted: number;
  contactsUpserted: number;
  leadsUpserted: number;
  errors: string[];
};

export type RecordParseOutcome = {
  status: ParseStatus;
  errors?: string;
};
