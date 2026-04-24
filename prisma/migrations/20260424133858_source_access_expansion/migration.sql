-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('official_api', 'open_data', 'report_download', 'html_scrape', 'permit_portal_search', 'manual_import', 'manual_review');

-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('active', 'inactive', 'repair_needed', 'manual_only', 'candidate');

-- CreateEnum
CREATE TYPE "FreshnessStatus" AS ENUM ('fresh', 'aging', 'stale', 'failed', 'unknown');

-- CreateEnum
CREATE TYPE "DataOrigin" AS ENUM ('live', 'imported', 'manual', 'fixture', 'unknown');

-- CreateEnum
CREATE TYPE "IngestionMethod" AS ENUM ('official_api', 'open_data', 'report_download', 'html_scrape', 'permit_portal_search', 'manual_import', 'fixture');

-- CreateEnum
CREATE TYPE "ContactMethodType" AS ENUM ('phone', 'email', 'website');

-- CreateEnum
CREATE TYPE "ContactVerificationStatus" AS ENUM ('verified', 'inferred', 'manual');

-- CreateEnum
CREATE TYPE "DiagnosticIssueType" AS ENUM ('source_drift', 'builder_duplicate', 'missing_builder_contact', 'transformation_mismatch', 'abnormal_row_drop', 'parse_quality_drop', 'stale_source', 'inactive_source', 'mock_source', 'duplicate_risk', 'incomplete_record', 'suspicious_zero_results');

-- CreateEnum
CREATE TYPE "DiagnosticSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SourceType" ADD VALUE 'planning_agenda';
ALTER TYPE "SourceType" ADD VALUE 'gis_portal';
ALTER TYPE "SourceType" ADD VALUE 'builder_directory';
ALTER TYPE "SourceType" ADD VALUE 'contractor_registry';
ALTER TYPE "SourceType" ADD VALUE 'open_data';

-- AlterTable
ALTER TABLE "RawRecord" ADD COLUMN     "dataOrigin" "DataOrigin" NOT NULL DEFAULT 'live';

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "accessMethod" "AccessMethod" NOT NULL DEFAULT 'manual_review',
ADD COLUMN     "activeStatus" "ActiveStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "completenessStatsJson" JSONB,
ADD COLUMN     "expectedFieldsJson" JSONB,
ADD COLUMN     "expectedUpdateFrequencyHours" INTEGER,
ADD COLUMN     "freshnessStatus" "FreshnessStatus" NOT NULL DEFAULT 'unknown',
ADD COLUMN     "lastAttemptedSyncAt" TIMESTAMP(3),
ADD COLUMN     "lastFailureReason" TEXT,
ADD COLUMN     "lastSuccessfulSyncAt" TIMESTAMP(3),
ADD COLUMN     "latestSourceHash" TEXT,
ADD COLUMN     "latestSyncSummaryJson" JSONB,
ADD COLUMN     "parseErrorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "parserName" TEXT,
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "rowCountLastSync" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scrapedAt" TIMESTAMP(3),
ADD COLUMN     "sourceConfidence" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "OrganizationContactMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ContactMethodType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "label" TEXT,
    "verificationStatus" "ContactVerificationStatus" NOT NULL DEFAULT 'verified',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "source" TEXT,
    "sourceUrl" TEXT,
    "dataOrigin" "DataOrigin" NOT NULL DEFAULT 'live',
    "provenanceJson" JSONB,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationContactMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSourceRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "organizationId" TEXT,
    "sourceRecordKey" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "rawCompanyName" TEXT NOT NULL,
    "normalizedCompanyName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "serviceArea" TEXT,
    "sourceUrl" TEXT,
    "sourceConfidence" INTEGER NOT NULL DEFAULT 50,
    "ingestionMethod" "IngestionMethod" NOT NULL,
    "dataOrigin" "DataOrigin" NOT NULL DEFAULT 'live',
    "rawPayloadJson" JSONB NOT NULL,
    "parseErrors" TEXT,
    "completenessJson" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityIssue" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "permitId" TEXT,
    "organizationId" TEXT,
    "issueType" "DiagnosticIssueType" NOT NULL,
    "severity" "DiagnosticSeverity" NOT NULL DEFAULT 'warning',
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "metricsJson" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationContactMethod_organizationId_type_confidence_idx" ON "OrganizationContactMethod"("organizationId", "type", "confidence");

-- CreateIndex
CREATE INDEX "OrganizationContactMethod_normalizedValue_idx" ON "OrganizationContactMethod"("normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationContactMethod_organizationId_type_value_key" ON "OrganizationContactMethod"("organizationId", "type", "value");

-- CreateIndex
CREATE INDEX "OrganizationSourceRecord_sourceId_normalizedCompanyName_idx" ON "OrganizationSourceRecord"("sourceId", "normalizedCompanyName");

-- CreateIndex
CREATE INDEX "OrganizationSourceRecord_organizationId_lastSeenAt_idx" ON "OrganizationSourceRecord"("organizationId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSourceRecord_sourceId_sourceRecordKey_canonical_key" ON "OrganizationSourceRecord"("sourceId", "sourceRecordKey", "canonicalHash");

-- CreateIndex
CREATE INDEX "DataQualityIssue_sourceId_issueType_status_idx" ON "DataQualityIssue"("sourceId", "issueType", "status");

-- CreateIndex
CREATE INDEX "DataQualityIssue_organizationId_issueType_status_idx" ON "DataQualityIssue"("organizationId", "issueType", "status");

-- CreateIndex
CREATE INDEX "DataQualityIssue_permitId_issueType_status_idx" ON "DataQualityIssue"("permitId", "issueType", "status");

-- CreateIndex
CREATE INDEX "DataQualityIssue_status_severity_detectedAt_idx" ON "DataQualityIssue"("status", "severity", "detectedAt");

-- CreateIndex
CREATE INDEX "Organization_normalizedDomain_idx" ON "Organization"("normalizedDomain");

-- CreateIndex
CREATE INDEX "Source_activeStatus_freshnessStatus_idx" ON "Source"("activeStatus", "freshnessStatus");

-- CreateIndex
CREATE INDEX "Source_type_accessMethod_idx" ON "Source"("type", "accessMethod");

-- AddForeignKey
ALTER TABLE "OrganizationContactMethod" ADD CONSTRAINT "OrganizationContactMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSourceRecord" ADD CONSTRAINT "OrganizationSourceRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSourceRecord" ADD CONSTRAINT "OrganizationSourceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
