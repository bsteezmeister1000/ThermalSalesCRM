import { subDays } from "date-fns";

import { getAdapters } from "@/lib/domain/adapters/registry";
import { prisma } from "@/lib/db/prisma";

export async function getDashboardData() {
  const today = subDays(new Date(), 1);
  const week = subDays(new Date(), 7);
  const registeredAdapterKeys = getAdapters().map((adapter) => adapter.definition.key);

  const [
    newToday,
    newWeek,
    highPriority,
    leadStatuses,
    cityCounts,
    builders,
    sources,
    permits
  ] = await Promise.all([
    prisma.lead.count({ where: { firstSeenAt: { gte: today } } }),
    prisma.lead.count({ where: { firstSeenAt: { gte: week } } }),
    prisma.lead.count({ where: { overallScore: { gte: 75 } } }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.permit.groupBy({
      by: ["city"],
      _count: { _all: true }
    }),
    prisma.organization.findMany({
      where: {
        type: {
          in: ["builder", "general_contractor", "developer"]
        }
      },
      take: 5,
      orderBy: {
        leadLinks: {
          _count: "desc"
        }
      },
      include: {
        _count: {
          select: {
            leadLinks: true
          }
        }
      }
    }),
    prisma.source.findMany({
      where: {
        adapterKey: {
          in: registeredAdapterKeys
        }
      },
      include: {
        syncJobRuns: {
          take: 1,
          orderBy: {
            startedAt: "desc"
          }
        }
      },
      orderBy: [{ enabled: "desc" }, { jurisdiction: "asc" }]
    }),
    prisma.permit.findMany({
      take: 12,
      orderBy: { issueDate: "desc" },
      select: {
        id: true,
        city: true,
        issueDate: true
      }
    })
  ]);

  const trendByDay = permits.reduce<Record<string, number>>((acc, permit) => {
    const dateKey = permit.issueDate?.toISOString().slice(0, 10) ?? "unknown";
    acc[dateKey] = (acc[dateKey] ?? 0) + 1;
    return acc;
  }, {});

  const subdivisionActivity = await prisma.property.groupBy({
    by: ["subdivision", "neighborhood"],
    _count: {
      id: true
    }
  });

  const subdivisionHotSpots = subdivisionActivity
    .sort((a, b) => (b._count.id ?? 0) - (a._count.id ?? 0))
    .slice(0, 5);

  return {
    metrics: {
      newToday,
      newWeek,
      highPriority
    },
    leadStatuses,
    cityCounts,
    topBuilders: builders,
    sources,
    trendByDay,
    subdivisionHotSpots
  };
}
