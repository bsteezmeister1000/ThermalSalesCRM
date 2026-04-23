import { unstable_cache } from "next/cache";
import { subDays } from "date-fns";

import { prisma } from "@/lib/db/prisma";

const getCachedDashboardData = unstable_cache(
  async () => {
    const today = subDays(new Date(), 1);
    const week = subDays(new Date(), 7);

    const [newToday, newWeek, highPriority, needsAction, statuses, builders, sources, recentActivity, recentLeads] =
      await Promise.all([
        prisma.lead.count({ where: { firstSeenAt: { gte: today } } }),
        prisma.lead.count({ where: { firstSeenAt: { gte: week } } }),
        prisma.lead.count({ where: { overallScore: { gte: 75 } } }),
        prisma.lead.count({
          where: {
            status: {
              in: ["new", "review", "qualified", "contacted", "estimating"]
            },
            OR: [{ nextActionState: { in: ["open", "waiting"] } }, { overallScore: { gte: 75 } }]
          }
        }),
        prisma.lead.groupBy({
          by: ["status"],
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
        prisma.leadActivity.findMany({
          take: 8,
          orderBy: {
            activityAt: "desc"
          },
          include: {
            lead: {
              include: {
                permit: true,
                primaryOrg: true
              }
            }
          }
        }),
        prisma.lead.findMany({
          take: 6,
          where: {
            OR: [{ overallScore: { gte: 75 } }, { status: { in: ["new", "review"] } }]
          },
          orderBy: [{ overallScore: "desc" }, { firstSeenAt: "desc" }],
          include: {
            permit: {
              include: {
                source: true
              }
            },
            primaryOrg: true,
            reviewFlags: {
              where: {
                resolvedAt: null
              }
            }
          }
        })
      ]);

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
        highPriority,
        needsAction
      },
      leadStatuses: statuses,
      topBuilders: builders,
      sources,
      recentActivity,
      recentLeads,
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
