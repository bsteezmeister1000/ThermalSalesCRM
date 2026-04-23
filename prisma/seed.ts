import { LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getAdapters } from "@/lib/domain/adapters/registry";
import { ingestSourceByKey } from "@/lib/domain/ingestion/service";
import { upsertSource } from "@/lib/repositories/source-repository";

function slugifyJurisdiction(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function seedSources() {
  for (const adapter of getAdapters()) {
    const health = await adapter.healthcheck();
    await upsertSource({
      adapterKey: adapter.definition.key,
      name: adapter.definition.name,
      jurisdiction: adapter.definition.jurisdiction,
      jurisdictionSlug: slugifyJurisdiction(adapter.definition.jurisdiction),
      type: adapter.definition.type,
      baseUrl: adapter.definition.key,
      supportsAutomation: health.supportsAutomation,
      manualReviewOnly: !health.supportsAutomation,
      crawlFrequencyMinutes: health.supportsAutomation ? 1440 : null,
      healthStatus: health.status,
      notes: adapter.definition.description,
      healthDetailsJson: {
        message: health.message,
        automationMode: adapter.definition.automationMode
      }
    });
  }
}

async function seedJobRuns() {
  const cedarRapids = await prisma.source.findFirstOrThrow({
    where: { adapterKey: "cedar-rapids-monthly-report" }
  });

  await prisma.syncJobRun.createMany({
    data: [
      {
        sourceId: cedarRapids.id,
        jobKey: "seed:daily_source_poll:2026-04-23",
        jobType: "daily_source_poll",
        status: "succeeded",
        triggerMode: "seed",
        startedAt: new Date("2026-04-23T05:00:00.000Z"),
        finishedAt: new Date("2026-04-23T05:02:00.000Z"),
        rowsDiscovered: 3,
        rowsFetched: 3,
        rowsParsed: 3,
        rowsInserted: 3,
        rowsUpdated: 0,
        metadataJson: { fixture: true }
      },
      {
        sourceId: null,
        jobKey: "seed:weekly_rollup_rebuild:2026-04-23",
        jobType: "weekly_rollup_rebuild",
        status: "queued",
        triggerMode: "seed",
        startedAt: new Date("2026-04-23T06:00:00.000Z"),
        metadataJson: { note: "Scheduled weekly organization momentum rebuild." }
      }
    ]
  });
}

async function seedChangeLogsAndActivities() {
  const leads = await prisma.lead.findMany({
    include: { permit: true },
    orderBy: { overallScore: "desc" }
  });

  for (const lead of leads) {
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: "scraped",
        activityAt: lead.firstSeenAt,
        actor: "system",
        detail: `Lead created from ${lead.permit.permitNumber ?? "unknown permit"}`
      }
    });
  }

  const topLead = leads[0];
  if (topLead) {
    await prisma.changeLog.create({
      data: {
        entityType: "Lead",
        entityId: topLead.id,
        changedFieldsJson: ["status", "reviewNotes"],
        previousValueJson: { status: "new", reviewNotes: null },
        newValueJson: {
          status: "review",
          reviewNotes: "High-fit new home builder worth immediate outreach."
        },
        changedAt: new Date(),
        actor: "seed"
      }
    });

    await prisma.lead.update({
      where: { id: topLead.id },
      data: {
        status: LeadStatus.review,
        reviewedAt: new Date(),
        reviewNotes: "High-fit new home builder worth immediate outreach."
      }
    });
  }
}

async function seedDigests() {
  const highPriorityLeads = await prisma.lead.findMany({
    where: { overallScore: { gte: 75 } },
    include: { permit: true, primaryOrg: true }
  });

  await prisma.digest.upsert({
    where: {
      digestDate_digestType: {
        digestDate: new Date("2026-04-23T00:00:00.000Z"),
        digestType: "daily_high_priority"
      }
    },
    update: {
      payloadJson: {
        count: highPriorityLeads.length,
        leads: highPriorityLeads.map((lead) => ({
          id: lead.id,
          permitNumber: lead.permit.permitNumber,
          organization: lead.primaryOrg?.name,
          overallScore: lead.overallScore
        }))
      }
    },
    create: {
      digestDate: new Date("2026-04-23T00:00:00.000Z"),
      digestType: "daily_high_priority",
      payloadJson: {
        count: highPriorityLeads.length,
        leads: highPriorityLeads.map((lead) => ({
          id: lead.id,
          permitNumber: lead.permit.permitNumber,
          organization: lead.primaryOrg?.name,
          overallScore: lead.overallScore
        }))
      }
    }
  });
}

async function main() {
  await seedSources();
  await ingestSourceByKey("cedar-rapids-monthly-report");
  await seedJobRuns();
  await seedChangeLogsAndActivities();
  await seedDigests();

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 50);
  await prisma.lead.updateMany({
    where: {
      status: LeadStatus.new,
      firstSeenAt: { lt: staleDate }
    },
    data: {
      reviewStateJson: {
        stale: true
      } as Prisma.InputJsonValue
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
