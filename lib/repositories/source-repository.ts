import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

type UpsertSourceInput = {
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
    | "manual_import";
  baseUrl: string;
  supportsAutomation: boolean;
  manualReviewOnly: boolean;
  crawlFrequencyMinutes?: number | null;
  healthStatus: "healthy" | "degraded" | "failed" | "manual_review" | "disabled";
  notes?: string | null;
  healthDetailsJson?: Record<string, unknown>;
};

export async function upsertSource(input: UpsertSourceInput) {
  return prisma.source.upsert({
    where: { adapterKey: input.adapterKey },
    update: {
      name: input.name,
      jurisdiction: input.jurisdiction,
      jurisdictionSlug: input.jurisdictionSlug,
      type: input.type,
      baseUrl: input.baseUrl,
      enabled: input.supportsAutomation,
      supportsAutomation: input.supportsAutomation,
      manualReviewOnly: input.manualReviewOnly,
      crawlFrequencyMinutes: input.crawlFrequencyMinutes,
      healthStatus: input.healthStatus,
      notes: input.notes,
      healthDetailsJson: input.healthDetailsJson as Prisma.InputJsonValue | undefined
    },
    create: {
      adapterKey: input.adapterKey,
      name: input.name,
      jurisdiction: input.jurisdiction,
      jurisdictionSlug: input.jurisdictionSlug,
      type: input.type,
      baseUrl: input.baseUrl,
      enabled: input.supportsAutomation,
      supportsAutomation: input.supportsAutomation,
      manualReviewOnly: input.manualReviewOnly,
      crawlFrequencyMinutes: input.crawlFrequencyMinutes,
      healthStatus: input.healthStatus,
      notes: input.notes,
      healthDetailsJson: input.healthDetailsJson as Prisma.InputJsonValue | undefined
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
              syncJobRuns: true
            }
          },
          syncJobRuns: {
            take: 5,
            orderBy: {
              startedAt: "desc"
            }
          }
        },
        orderBy: [{ enabled: "desc" }, { jurisdiction: "asc" }]
      }),
    ["sources-with-latest-runs"],
    { revalidate: 60 }
  )();
}
