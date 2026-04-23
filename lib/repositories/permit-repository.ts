import prisma from "@/lib/prisma";

import type { PermitListFilters } from "@/lib/domain/types";
import { classifyRadiusMatch, CEDAR_RAPIDS_CENTER } from "@/lib/domain/location/radius";

type PermitSort = NonNullable<PermitListFilters["sort"]>;

function comparePermits(sort: PermitSort, a: PermitListItem, b: PermitListItem) {
  switch (sort) {
    case "oldest":
      return (a.issueDate?.getTime() ?? 0) - (b.issueDate?.getTime() ?? 0);
    case "highest_value":
      return (Number(b.valuation ?? 0) || 0) - (Number(a.valuation ?? 0) || 0);
    case "priority":
      return (b.score ?? -1) - (a.score ?? -1);
    case "recently_seen":
      return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
    case "newest":
    default:
      return (b.issueDate?.getTime() ?? 0) - (a.issueDate?.getTime() ?? 0);
  }
}

export type PermitListItem = {
  id: string;
  permitNumber: string | null;
  permitType: string | null;
  workClass: string | null;
  issueDate: Date | null;
  status: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  valuation: unknown;
  lastSeenAt: Date;
  source: {
    id: string;
    name: string;
    jurisdiction: string;
  };
  property: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  lead: {
    id: string;
    status: string;
    overallScore: number;
    primaryOrg: { name: string } | null;
  } | null;
  radiusMatch: ReturnType<typeof classifyRadiusMatch>;
  linkedOrganization: string | null;
  leadStatus: string | null;
  score: number | null;
};

export async function listPermitsWithinRadius(filters: PermitListFilters) {
  const permits = await prisma.permit.findMany({
    where: {
      city: filters.city
        ? {
            equals: filters.city,
            mode: "insensitive"
          }
        : undefined,
      permitType: filters.permitType
        ? {
            contains: filters.permitType,
            mode: "insensitive"
          }
        : undefined,
      status: filters.status
        ? {
            contains: filters.status,
            mode: "insensitive"
          }
        : undefined,
      sourceId: filters.sourceId || undefined,
      lead: filters.leadStatus
        ? {
            status: filters.leadStatus
          }
        : undefined,
      OR: filters.query
        ? [
            { permitNumber: { contains: filters.query, mode: "insensitive" } },
            { address1: { contains: filters.query, mode: "insensitive" } },
            { city: { contains: filters.query, mode: "insensitive" } },
            { projectName: { contains: filters.query, mode: "insensitive" } },
            { projectDescription: { contains: filters.query, mode: "insensitive" } }
          ]
        : undefined
    },
    include: {
      source: {
        select: {
          id: true,
          name: true,
          jurisdiction: true
        }
      },
      property: {
        select: {
          latitude: true,
          longitude: true
        }
      },
      lead: {
        select: {
          id: true,
          status: true,
          overallScore: true,
          primaryOrg: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  const mapped = permits.map((permit) => {
    const latitude =
      permit.property?.latitude != null ? Number(permit.property.latitude) : null;
    const longitude =
      permit.property?.longitude != null ? Number(permit.property.longitude) : null;
    const radiusMatch = classifyRadiusMatch({
      city: permit.city,
      latitude,
      longitude
    });

    return {
      id: permit.id,
      permitNumber: permit.permitNumber,
      permitType: permit.permitType,
      workClass: permit.workClass,
      issueDate: permit.issueDate,
      status: permit.status,
      address1: permit.address1,
      city: permit.city,
      state: permit.state,
      valuation: permit.valuation,
      lastSeenAt: permit.lastSeenAt,
      source: permit.source,
      property: permit.property
        ? {
            latitude,
            longitude
          }
        : null,
      lead: permit.lead,
      radiusMatch,
      linkedOrganization: permit.lead?.primaryOrg?.name ?? null,
      leadStatus: permit.lead?.status ?? null,
      score: permit.lead?.overallScore ?? null
    } satisfies PermitListItem;
  });

  const included = mapped.filter((permit) => {
    if (filters.radiusMode === "verified_only") {
      return permit.radiusMatch.inclusion === "inside" && permit.radiusMatch.confidence === "exact";
    }

    return permit.radiusMatch.inclusion === "inside";
  });

  included.sort((a, b) => comparePermits(filters.sort ?? "newest", a, b));

  const cityBreakdown = included.reduce<Record<string, number>>((acc, permit) => {
    const key = permit.city ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const permitTypeBreakdown = included.reduce<Record<string, number>>((acc, permit) => {
    const key = permit.permitType ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    center: CEDAR_RAPIDS_CENTER,
    permits: included,
    totals: {
      totalInRadius: included.length,
      exactMatches: included.filter((permit) => permit.radiusMatch.confidence === "exact").length,
      approximateMatches: included.filter((permit) => permit.radiusMatch.confidence === "approx_city").length,
      excludedUnknown: mapped.filter((permit) => permit.radiusMatch.inclusion === "unknown").length
    },
    cityBreakdown: Object.entries(cityBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count })),
    permitTypeBreakdown: Object.entries(permitTypeBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([permitType, count]) => ({ permitType, count }))
  };
}

export async function findPermitById(id: string) {
  const permit = await prisma.permit.findUnique({
    where: { id },
    include: {
      source: true,
      property: true,
      lead: {
        include: {
          primaryOrg: true,
          organizationLinks: {
            include: {
              organization: true
            }
          },
          activities: {
            orderBy: {
              activityAt: "desc"
            },
            take: 8
          },
          reviewFlags: {
            where: {
              resolvedAt: null
            }
          }
        }
      },
      snapshots: {
        orderBy: {
          observedAt: "desc"
        },
        take: 8
      }
    }
  });

  if (!permit) {
    return null;
  }

  const recentChanges = await prisma.changeLog.findMany({
    where: {
      entityType: "Permit",
      entityId: permit.id
    },
    orderBy: {
      changedAt: "desc"
    },
    take: 8
  });

  const radiusMatch = classifyRadiusMatch({
    city: permit.city,
    latitude: permit.property?.latitude != null ? Number(permit.property.latitude) : null,
    longitude: permit.property?.longitude != null ? Number(permit.property.longitude) : null
  });

  return {
    ...permit,
    radiusMatch,
    recentChanges
  };
}
