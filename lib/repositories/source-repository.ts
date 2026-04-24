import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

type UpsertSourceInput = {
  preserveRuntimeStatus?: boolean;
  adapterKey: string;
  name: string;
  jurisdiction: string;
  jurisdictionSlug: string;
  type:
    | "pdf_report"
    | "xlsx_report"
    | "public_search"
    | "permit_detail"
    | "assessor"
    | "manual_import"
    | "planning_agenda"
    | "gis_portal"
    | "builder_directory"
    | "contractor_registry"
    | "open_data";
  accessMethod:
    | "official_api"
    | "open_data"
    | "report_download"
    | "html_scrape"
    | "permit_portal_search"
    | "manual_import"
    | "manual_review";
  baseUrl: string;
  activeStatus: "active" | "inactive" | "repair_needed" | "manual_only" | "candidate";
  supportsAutomation: boolean;
  manualReviewOnly: boolean;
  crawlFrequencyMinutes?: number | null;
  expectedUpdateFrequencyHours?: number | null;
  expectedFields?: string[] | null;
  parserName?: string | null;
  parserVersion?: string | null;
  healthStatus: "healthy" | "degraded" | "failed" | "manual_review" | "disabled";
  freshnessStatus?: "fresh" | "aging" | "stale" | "failed" | "unknown";
  sourceConfidence?: number | null;
  rowCountLastSync?: number | null;
  parseErrorRate?: number | null;
  completenessStatsJson?: Record<string, unknown> | null;
  lastFailureReason?: string | null;
  latestSourceHash?: string | null;
  latestSyncSummaryJson?: Record<string, unknown> | null;
  notes?: string | null;
  healthDetailsJson?: Record<string, unknown> | null;
};

export async function upsertSource(input: UpsertSourceInput) {
  return prisma.source.upsert({
    where: { adapterKey: input.adapterKey },
    update: {
      name: input.name,
      jurisdiction: input.jurisdiction,
      jurisdictionSlug: input.jurisdictionSlug,
      type: input.type,
      accessMethod: input.accessMethod,
      baseUrl: input.baseUrl,
      enabled: input.supportsAutomation,
      activeStatus: input.activeStatus,
      supportsAutomation: input.supportsAutomation,
      manualReviewOnly: input.manualReviewOnly,
      crawlFrequencyMinutes: input.crawlFrequencyMinutes,
      expectedUpdateFrequencyHours: input.expectedUpdateFrequencyHours,
      expectedFieldsJson: input.expectedFields as Prisma.InputJsonValue | undefined,
      parserName: input.parserName,
      parserVersion: input.parserVersion,
      healthStatus: input.preserveRuntimeStatus ? undefined : input.healthStatus,
      freshnessStatus: input.preserveRuntimeStatus ? undefined : input.freshnessStatus ?? "unknown",
      sourceConfidence: input.preserveRuntimeStatus ? undefined : input.sourceConfidence ?? undefined,
      rowCountLastSync: input.preserveRuntimeStatus ? undefined : input.rowCountLastSync ?? undefined,
      parseErrorRate: input.preserveRuntimeStatus ? undefined : input.parseErrorRate ?? undefined,
      completenessStatsJson: input.preserveRuntimeStatus
        ? undefined
        : (input.completenessStatsJson as Prisma.InputJsonValue | undefined),
      lastFailureReason: input.preserveRuntimeStatus ? undefined : input.lastFailureReason,
      latestSourceHash: input.preserveRuntimeStatus ? undefined : input.latestSourceHash,
      latestSyncSummaryJson: input.preserveRuntimeStatus
        ? undefined
        : (input.latestSyncSummaryJson as Prisma.InputJsonValue | undefined),
      notes: input.notes,
      healthDetailsJson: input.healthDetailsJson as Prisma.InputJsonValue | undefined
    },
    create: {
      adapterKey: input.adapterKey,
      name: input.name,
      jurisdiction: input.jurisdiction,
      jurisdictionSlug: input.jurisdictionSlug,
      type: input.type,
      accessMethod: input.accessMethod,
      baseUrl: input.baseUrl,
      enabled: input.supportsAutomation,
      activeStatus: input.activeStatus,
      supportsAutomation: input.supportsAutomation,
      manualReviewOnly: input.manualReviewOnly,
      crawlFrequencyMinutes: input.crawlFrequencyMinutes,
      expectedUpdateFrequencyHours: input.expectedUpdateFrequencyHours,
      expectedFieldsJson: input.expectedFields as Prisma.InputJsonValue | undefined,
      parserName: input.parserName,
      parserVersion: input.parserVersion,
      healthStatus: input.healthStatus,
      freshnessStatus: input.freshnessStatus ?? "unknown",
      sourceConfidence: input.sourceConfidence ?? 50,
      rowCountLastSync: input.rowCountLastSync ?? 0,
      parseErrorRate: input.parseErrorRate ?? 0,
      completenessStatsJson: input.completenessStatsJson as Prisma.InputJsonValue | undefined,
      lastFailureReason: input.lastFailureReason,
      latestSourceHash: input.latestSourceHash,
      latestSyncSummaryJson: input.latestSyncSummaryJson as Prisma.InputJsonValue | undefined,
      notes: input.notes,
      healthDetailsJson: input.healthDetailsJson as Prisma.InputJsonValue | undefined
    }
  });
}

export async function updateSourceSyncStatus(
  sourceId: string,
  input: {
    checkedAt?: Date;
    scrapedAt?: Date | null;
    lastAttemptedSyncAt?: Date;
    lastSuccessfulSyncAt?: Date | null;
    lastRunAt?: Date;
    lastSuccessAt?: Date | null;
    lastFailureAt?: Date | null;
    healthStatus?: "healthy" | "degraded" | "failed" | "manual_review" | "disabled";
    freshnessStatus?: "fresh" | "aging" | "stale" | "failed" | "unknown";
    rowCountLastSync?: number;
    parseErrorRate?: number;
    sourceConfidence?: number;
    completenessStatsJson?: Record<string, unknown>;
    lastFailureReason?: string | null;
    latestSourceHash?: string | null;
    latestSyncSummaryJson?: Record<string, unknown>;
    consecutiveFailures?: number;
  }
) {
  return prisma.source.update({
    where: { id: sourceId },
    data: {
      checkedAt: input.checkedAt,
      scrapedAt: input.scrapedAt ?? undefined,
      lastAttemptedSyncAt: input.lastAttemptedSyncAt,
      lastSuccessfulSyncAt: input.lastSuccessfulSyncAt ?? undefined,
      lastRunAt: input.lastRunAt,
      lastSuccessAt: input.lastSuccessAt ?? undefined,
      lastFailureAt: input.lastFailureAt ?? undefined,
      healthStatus: input.healthStatus,
      freshnessStatus: input.freshnessStatus,
      rowCountLastSync: input.rowCountLastSync,
      parseErrorRate: input.parseErrorRate,
      sourceConfidence: input.sourceConfidence,
      completenessStatsJson: input.completenessStatsJson as Prisma.InputJsonValue | undefined,
      lastFailureReason: input.lastFailureReason,
      latestSourceHash: input.latestSourceHash,
      latestSyncSummaryJson: input.latestSyncSummaryJson as Prisma.InputJsonValue | undefined,
      consecutiveFailures: input.consecutiveFailures
    }
  });
}

export async function listSourcesWithLatestRuns() {
  return unstable_cache(
    async () =>
      prisma.source.findMany({
        include: {
          _count: {
            select: {
              rawRecords: true,
              permits: true,
              syncJobRuns: true,
              organizationSourceRecords: true,
              diagnostics: true
            }
          },
          syncJobRuns: {
            take: 5,
            orderBy: {
              startedAt: "desc"
            }
          },
          diagnostics: {
            where: { status: "open" },
            take: 5,
            orderBy: { detectedAt: "desc" }
          }
        },
        orderBy: [{ activeStatus: "asc" }, { jurisdiction: "asc" }, { name: "asc" }]
      }),
    ["sources-with-latest-runs"],
    { revalidate: 60 }
  )();
}
