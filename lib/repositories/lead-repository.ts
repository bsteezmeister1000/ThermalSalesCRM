import prisma from "@/lib/prisma";
import type { LeadStatus, LeadType, Prisma } from "@prisma/client";

export async function findLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      permit: {
        include: {
          source: true,
          snapshots: {
            orderBy: {
              observedAt: "desc"
            },
            take: 10
          }
        }
      },
      property: true,
      primaryOrg: {
        include: {
          contacts: true
        }
      },
      organizationLinks: {
        include: {
          organization: true
        }
      },
      activities: {
        orderBy: {
          activityAt: "desc"
        }
      },
      reviewFlags: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
}

export async function listLeadQueue(input: {
  city?: string;
  permitType?: string;
  leadType?: LeadType | "";
  status?: LeadStatus | "";
  organization?: string;
  query?: string;
  minScore?: number;
  maxScore?: number;
  sort?:
    | "newest"
    | "highest_score"
    | "valuation"
    | "builder_momentum"
    | "recently_changed";
}) {
  const where: Prisma.LeadWhereInput = {
    status: input.status || undefined,
    leadType: input.leadType || undefined,
    overallScore: {
      gte: input.minScore,
      lte: input.maxScore
    },
    primaryOrg: input.organization
      ? {
          name: {
            contains: input.organization,
            mode: "insensitive"
          }
        }
      : undefined,
    permit: {
      city: input.city
        ? {
            equals: input.city,
            mode: "insensitive"
          }
        : undefined,
      permitType: input.permitType
        ? {
            contains: input.permitType,
            mode: "insensitive"
          }
        : undefined,
      OR: input.query
        ? [
            { permitNumber: { contains: input.query, mode: "insensitive" } },
            { address1: { contains: input.query, mode: "insensitive" } },
            { projectName: { contains: input.query, mode: "insensitive" } },
            { projectDescription: { contains: input.query, mode: "insensitive" } }
          ]
        : undefined
    }
  };

  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      leadType: true,
      status: true,
      overallScore: true,
      recommendedAction: true,
      firstSeenAt: true,
      permit: {
        select: {
          address1: true,
          city: true,
          state: true,
          permitNumber: true,
          permitType: true,
          issueDate: true,
          valuation: true,
          source: {
            select: {
              jurisdiction: true
            }
          }
        }
      },
      primaryOrg: {
        select: {
          name: true
        }
      },
      reviewFlags: {
        where: {
          resolvedAt: null
        },
        select: {
          id: true,
          flag: true
        }
      },
      _count: {
        select: {
          organizationLinks: true
        }
      }
    },
    orderBy:
      input.sort === "highest_score"
        ? { overallScore: "desc" }
        : input.sort === "valuation"
          ? { permit: { valuation: "desc" } }
          : input.sort === "recently_changed"
            ? { updatedAt: "desc" }
            : { firstSeenAt: "desc" },
    take: 100
  });

  if (input.sort === "builder_momentum") {
    return [...leads].sort((a, b) => b._count.organizationLinks - a._count.organizationLinks);
  }

  return leads;
}

export async function updateLeadStatus(input: {
  id: string;
  status: LeadStatus;
  note?: string;
  actor?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewedAt: new Date(),
        lastActivityAt: new Date(),
        reviewNotes: input.note || undefined
      }
    });

    await tx.leadActivity.create({
      data: {
        leadId: input.id,
        activityType:
          input.status === "contacted"
            ? "contacted"
            : input.status === "bid_sent"
              ? "bid_sent"
              : input.status === "won"
                ? "won"
                : input.status === "lost"
                  ? "lost"
                  : "reviewed",
        activityAt: new Date(),
        actor: input.actor ?? "system",
        detail: input.note || `Lead status changed to ${input.status}.`
      }
    });

    return lead;
  });
}
