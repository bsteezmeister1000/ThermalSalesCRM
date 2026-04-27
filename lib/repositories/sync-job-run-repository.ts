import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export async function createSyncJobRun(input: {
  sourceId?: string | null;
  jobKey: string;
  jobType: string;
  triggerMode?: string;
  status?: "queued" | "running" | "succeeded" | "failed";
  startedAt: Date;
  finishedAt?: Date | null;
  rowsDiscovered?: number;
  rowsFetched?: number;
  rowsParsed?: number;
  rowsInserted?: number;
  rowsUpdated?: number;
  errorMessage?: string | null;
  metadataJson?: Record<string, unknown>;
}) {
  return prisma.syncJobRun.create({
    data: {
      sourceId: input.sourceId ?? null,
      jobKey: input.jobKey,
      jobType: input.jobType,
      triggerMode: input.triggerMode ?? "scheduled",
      status: input.status ?? "queued",
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      rowsDiscovered: input.rowsDiscovered ?? 0,
      rowsFetched: input.rowsFetched ?? 0,
      rowsParsed: input.rowsParsed ?? 0,
      rowsInserted: input.rowsInserted ?? 0,
      rowsUpdated: input.rowsUpdated ?? 0,
      errorMessage: input.errorMessage ?? null,
      metadataJson: input.metadataJson as Prisma.InputJsonValue | undefined
    }
  });
}

export async function listRecentSyncJobRuns() {
  return prisma.syncJobRun.findMany({
    include: {
      source: true
    },
    orderBy: {
      startedAt: "desc"
    },
    take: 50
  });
}
