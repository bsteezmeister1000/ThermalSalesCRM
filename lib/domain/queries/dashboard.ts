import { unstable_cache } from "next/cache";
import { subDays } from "date-fns";

import { prisma } from "@/lib/db/prisma";

const getCachedDashboardData = unstable_cache(
  async () => {
  const today = subDays(new Date(), 1);
  const week = subDays(new Date(), 7);

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
  },
  ["dashboard-data"],
  {
    revalidate: 60
  }
);

export async function getDashboardData() {
  return getCachedDashboardData();
}
