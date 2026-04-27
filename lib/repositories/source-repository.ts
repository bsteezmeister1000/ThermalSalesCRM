import { Prisma } from "@prisma/client";

import { getAdapters } from "@/lib/domain/adapters/registry";
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

function slugifyJurisdiction(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function syncRegisteredSourceDefaults() {
  for (const adapter of getAdapters()) {
    const supportsAutomation = adapter.definition.automationMode === "automated";

    await prisma.source.upsert({
      where: { adapterKey: adapter.definition.key },
      update: {
        name: adapter.definition.name,
        jurisdiction: adapter.definition.jurisdiction,
        jurisdictionSlug: slugifyJurisdiction(adapter.definition.jurisdiction),
        type: adapter.definition.type,
        enabled: supportsAutomation,
        supportsAutomation,
        manualReviewOnly: !supportsAutomation,
        crawlFrequencyMinutes: supportsAutomation
          ? adapter.definition.crawlFrequencyMinutes ?? 60 * 24
          : null,
        notes: adapter.definition.description,
        healthDetailsJson: {
          automationMode: adapter.definition.automationMode,
          scheduleSource: "adapter_default"
        }
      },
      create: {
        adapterKey: adapter.definition.key,
        name: adapter.definition.name,
        jurisdiction: adapter.definition.jurisdiction,
        jurisdictionSlug: slugifyJurisdiction(adapter.definition.jurisdiction),
        type: adapter.definition.type,
        baseUrl: adapter.definition.key,
        enabled: supportsAutomation,
        supportsAutomation,
        manualReviewOnly: !supportsAutomation,
        crawlFrequencyMinutes: supportsAutomation
          ? adapter.definition.crawlFrequencyMinutes ?? 60 * 24
          : null,
        healthStatus: supportsAutomation ? "healthy" : "manual_review",
        notes: adapter.definition.description,
        healthDetailsJson: {
          automationMode: adapter.definition.automationMode,
          scheduleSource: "adapter_default"
        }
      }
    });
  }
}

export async function listSourcesWithLatestRuns() {
  await syncRegisteredSourceDefaults();

  const registeredAdapterKeys = getAdapters().map((adapter) => adapter.definition.key);

  return prisma.source.findMany({
    where: {
      adapterKey: {
        in: registeredAdapterKeys
      }
    },
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
  });
}
