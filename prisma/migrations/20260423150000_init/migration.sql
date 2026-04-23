-- Create enums
CREATE TYPE "SourceType" AS ENUM ('pdf_report', 'xlsx_report', 'public_search', 'permit_detail', 'assessor', 'manual_import');
CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'degraded', 'failed', 'manual_review', 'disabled');
CREATE TYPE "ParseStatus" AS ENUM ('pending', 'parsed', 'low_confidence', 'failed', 'ignored');
CREATE TYPE "OrganizationType" AS ENUM ('builder', 'general_contractor', 'subcontractor', 'developer', 'owner', 'supplier', 'unknown');
CREATE TYPE "LeadType" AS ENUM ('new_home', 'multifamily', 'commercial', 'remodel', 'addition', 'retrofit_adjacent', 'unknown');
CREATE TYPE "LeadStatus" AS ENUM ('new', 'review', 'qualified', 'contacted', 'estimating', 'bid_sent', 'won', 'lost', 'archived');
CREATE TYPE "RelationshipType" AS ENUM ('builder', 'owner', 'gc', 'applicant', 'contractor', 'contact_match', 'inferred');
CREATE TYPE "ActivityType" AS ENUM ('scraped', 'updated', 'reviewed', 'contacted', 'note', 'estimate_created', 'bid_sent', 'won', 'lost');
CREATE TYPE "ReviewFlagType" AS ENUM ('possible_duplicate', 'parse_uncertainty', 'irrelevant_permit', 'missing_builder', 'missing_contact', 'likely_good_lead', 'stale');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- Create tables
CREATE TABLE "Source" (
  "id" TEXT NOT NULL,
  "adapterKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "jurisdictionSlug" TEXT NOT NULL,
  "type" "SourceType" NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "supportsAutomation" BOOLEAN NOT NULL DEFAULT true,
  "manualReviewOnly" BOOLEAN NOT NULL DEFAULT false,
  "crawlFrequencyMinutes" INTEGER,
  "lastRunAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "healthStatus" "HealthStatus" NOT NULL DEFAULT 'healthy',
  "notes" TEXT,
  "healthDetailsJson" JSONB,
  "configJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RawRecord" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceRecordKey" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "rawPayloadJson" JSONB NOT NULL,
  "rawText" TEXT,
  "canonicalHash" TEXT NOT NULL,
  "parseStatus" "ParseStatus" NOT NULL DEFAULT 'pending',
  "parseErrors" TEXT,
  "sourceUrl" TEXT,
  "contentType" TEXT,
  "httpStatus" INTEGER,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "lineageJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RawRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "normalizedAddressKey" TEXT NOT NULL,
  "normalizedParcelKey" TEXT,
  "address1" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "zip" TEXT,
  "parcelNumber" TEXT,
  "subdivision" TEXT,
  "neighborhood" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "assessedValue" DECIMAL(12,2),
  "landValue" DECIMAL(12,2),
  "improvementValue" DECIMAL(12,2),
  "yearBuilt" INTEGER,
  "dwellingType" TEXT,
  "notes" TEXT,
  "assessorUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL DEFAULT 'unknown',
  "website" TEXT,
  "normalizedDomain" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "aliasesJson" JSONB,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permit" (
  "id" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "permitNumber" TEXT,
  "permitNumberNormalized" TEXT,
  "permitType" TEXT,
  "workClass" TEXT,
  "issueDate" TIMESTAMP(3),
  "applicationDate" TIMESTAMP(3),
  "status" TEXT,
  "statusNormalized" TEXT,
  "address1" TEXT,
  "address2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "parcelNumber" TEXT,
  "projectName" TEXT,
  "projectDescription" TEXT,
  "valuation" DECIMAL(12,2),
  "permitUrl" TEXT,
  "sourceConfidence" INTEGER NOT NULL DEFAULT 50,
  "provenanceJson" JSONB,
  "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "propertyId" TEXT,

  CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PermitSnapshot" (
  "id" TEXT NOT NULL,
  "permitId" TEXT NOT NULL,
  "rawRecordId" TEXT,
  "snapshotHash" TEXT NOT NULL,
  "normalizedDataJson" JSONB NOT NULL,
  "changedFieldsJson" JSONB,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PermitSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonContact" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "roleTitle" TEXT,
  "email" TEXT,
  "normalizedEmail" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "sourceUrl" TEXT,
  "provenanceJson" JSONB,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PersonContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "permitId" TEXT NOT NULL,
  "propertyId" TEXT,
  "primaryOrgId" TEXT,
  "mergedIntoLeadId" TEXT,
  "leadType" "LeadType" NOT NULL DEFAULT 'unknown',
  "insulationFitScore" INTEGER NOT NULL DEFAULT 0,
  "revenuePotentialScore" INTEGER NOT NULL DEFAULT 0,
  "relationshipScore" INTEGER NOT NULL DEFAULT 0,
  "freshnessScore" INTEGER NOT NULL DEFAULT 0,
  "overallScore" INTEGER NOT NULL DEFAULT 0,
  "recommendedAction" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'new',
  "assignedTo" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "suppressionReason" TEXT,
  "suppressedAt" TIMESTAMP(3),
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "scoreExplanationJson" JSONB,
  "reviewStateJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadOrganizationLink" (
  "leadId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "relationshipType" "RelationshipType" NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeadOrganizationLink_pkey" PRIMARY KEY ("leadId","organizationId","relationshipType")
);

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "activityType" "ActivityType" NOT NULL,
  "activityAt" TIMESTAMP(3) NOT NULL,
  "actor" TEXT,
  "detail" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncJobRun" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT,
  "jobKey" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "triggerMode" TEXT NOT NULL DEFAULT 'scheduled',
  "status" "JobStatus" NOT NULL DEFAULT 'queued',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "rowsDiscovered" INTEGER NOT NULL DEFAULT 0,
  "rowsFetched" INTEGER NOT NULL DEFAULT 0,
  "rowsParsed" INTEGER NOT NULL DEFAULT 0,
  "rowsInserted" INTEGER NOT NULL DEFAULT 0,
  "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "errorDetailsJson" JSONB,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SyncJobRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChangeLog" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "changedFieldsJson" JSONB NOT NULL,
  "previousValueJson" JSONB,
  "newValueJson" JSONB,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor" TEXT,
  "sourceSyncJobRunId" TEXT,
  "sourceRawRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewFlag" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "flag" "ReviewFlagType" NOT NULL,
  "detail" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReviewFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Digest" (
  "id" TEXT NOT NULL,
  "digestDate" TIMESTAMP(3) NOT NULL,
  "digestType" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "Source_adapterKey_key" ON "Source"("adapterKey");
CREATE UNIQUE INDEX "Source_name_jurisdiction_key" ON "Source"("name", "jurisdiction");
CREATE UNIQUE INDEX "RawRecord_sourceId_sourceRecordKey_canonicalHash_key" ON "RawRecord"("sourceId", "sourceRecordKey", "canonicalHash");
CREATE UNIQUE INDEX "Property_normalizedAddressKey_key" ON "Property"("normalizedAddressKey");
CREATE UNIQUE INDEX "Property_normalizedParcelKey_key" ON "Property"("normalizedParcelKey");
CREATE UNIQUE INDEX "Organization_normalizedName_key" ON "Organization"("normalizedName");
CREATE UNIQUE INDEX "Permit_normalizedKey_key" ON "Permit"("normalizedKey");
CREATE UNIQUE INDEX "PermitSnapshot_permitId_snapshotHash_key" ON "PermitSnapshot"("permitId", "snapshotHash");
CREATE UNIQUE INDEX "PersonContact_organizationId_normalizedEmail_key" ON "PersonContact"("organizationId", "normalizedEmail");
CREATE UNIQUE INDEX "Lead_permitId_key" ON "Lead"("permitId");
CREATE UNIQUE INDEX "SyncJobRun_jobKey_key" ON "SyncJobRun"("jobKey");
CREATE UNIQUE INDEX "Digest_digestDate_digestType_key" ON "Digest"("digestDate", "digestType");

-- Create secondary indexes
CREATE INDEX "Source_jurisdictionSlug_enabled_idx" ON "Source"("jurisdictionSlug", "enabled");
CREATE INDEX "RawRecord_sourceId_sourceRecordKey_idx" ON "RawRecord"("sourceId", "sourceRecordKey");
CREATE INDEX "RawRecord_sourceId_lastSeenAt_idx" ON "RawRecord"("sourceId", "lastSeenAt");
CREATE INDEX "RawRecord_canonicalHash_idx" ON "RawRecord"("canonicalHash");
CREATE INDEX "Permit_sourceId_permitNumber_idx" ON "Permit"("sourceId", "permitNumber");
CREATE INDEX "Permit_city_issueDate_idx" ON "Permit"("city", "issueDate");
CREATE INDEX "Permit_permitType_workClass_idx" ON "Permit"("permitType", "workClass");
CREATE INDEX "Permit_statusNormalized_lastSeenAt_idx" ON "Permit"("statusNormalized", "lastSeenAt");
CREATE INDEX "Permit_parcelNumber_idx" ON "Permit"("parcelNumber");
CREATE INDEX "Permit_propertyId_idx" ON "Permit"("propertyId");
CREATE INDEX "PermitSnapshot_permitId_observedAt_idx" ON "PermitSnapshot"("permitId", "observedAt");
CREATE INDEX "PermitSnapshot_rawRecordId_idx" ON "PermitSnapshot"("rawRecordId");
CREATE INDEX "Organization_type_lastSeenAt_idx" ON "Organization"("type", "lastSeenAt");
CREATE INDEX "PersonContact_organizationId_lastVerifiedAt_idx" ON "PersonContact"("organizationId", "lastVerifiedAt");
CREATE INDEX "Property_city_state_idx" ON "Property"("city", "state");
CREATE INDEX "Property_subdivision_idx" ON "Property"("subdivision");
CREATE INDEX "Property_neighborhood_idx" ON "Property"("neighborhood");
CREATE INDEX "Lead_status_overallScore_idx" ON "Lead"("status", "overallScore");
CREATE INDEX "Lead_leadType_overallScore_idx" ON "Lead"("leadType", "overallScore");
CREATE INDEX "Lead_primaryOrgId_lastActivityAt_idx" ON "Lead"("primaryOrgId", "lastActivityAt");
CREATE INDEX "Lead_mergedIntoLeadId_idx" ON "Lead"("mergedIntoLeadId");
CREATE INDEX "LeadOrganizationLink_organizationId_relationshipType_idx" ON "LeadOrganizationLink"("organizationId", "relationshipType");
CREATE INDEX "LeadActivity_leadId_activityAt_idx" ON "LeadActivity"("leadId", "activityAt");
CREATE INDEX "LeadActivity_activityType_activityAt_idx" ON "LeadActivity"("activityType", "activityAt");
CREATE INDEX "SyncJobRun_sourceId_startedAt_idx" ON "SyncJobRun"("sourceId", "startedAt");
CREATE INDEX "SyncJobRun_jobType_status_startedAt_idx" ON "SyncJobRun"("jobType", "status", "startedAt");
CREATE INDEX "ChangeLog_entityType_entityId_changedAt_idx" ON "ChangeLog"("entityType", "entityId", "changedAt");
CREATE INDEX "ChangeLog_sourceSyncJobRunId_idx" ON "ChangeLog"("sourceSyncJobRunId");
CREATE INDEX "ChangeLog_sourceRawRecordId_idx" ON "ChangeLog"("sourceRawRecordId");
CREATE INDEX "ReviewFlag_leadId_flag_idx" ON "ReviewFlag"("leadId", "flag");

-- Add foreign keys
ALTER TABLE "RawRecord"
  ADD CONSTRAINT "RawRecord_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Permit"
  ADD CONSTRAINT "Permit_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Permit"
  ADD CONSTRAINT "Permit_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PermitSnapshot"
  ADD CONSTRAINT "PermitSnapshot_permitId_fkey"
  FOREIGN KEY ("permitId") REFERENCES "Permit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PermitSnapshot"
  ADD CONSTRAINT "PermitSnapshot_rawRecordId_fkey"
  FOREIGN KEY ("rawRecordId") REFERENCES "RawRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PersonContact"
  ADD CONSTRAINT "PersonContact_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_permitId_fkey"
  FOREIGN KEY ("permitId") REFERENCES "Permit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_primaryOrgId_fkey"
  FOREIGN KEY ("primaryOrgId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_mergedIntoLeadId_fkey"
  FOREIGN KEY ("mergedIntoLeadId") REFERENCES "Lead"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadOrganizationLink"
  ADD CONSTRAINT "LeadOrganizationLink_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadOrganizationLink"
  ADD CONSTRAINT "LeadOrganizationLink_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
  ADD CONSTRAINT "LeadActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SyncJobRun"
  ADD CONSTRAINT "SyncJobRun_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChangeLog"
  ADD CONSTRAINT "ChangeLog_sourceSyncJobRunId_fkey"
  FOREIGN KEY ("sourceSyncJobRunId") REFERENCES "SyncJobRun"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChangeLog"
  ADD CONSTRAINT "ChangeLog_sourceRawRecordId_fkey"
  FOREIGN KEY ("sourceRawRecordId") REFERENCES "RawRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewFlag"
  ADD CONSTRAINT "ReviewFlag_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
