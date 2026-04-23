import prisma from "@/lib/prisma";
import type { ActivityType, LeadStatus, LeadType, NextActionState, Prisma } from "@prisma/client";

export async function findLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
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
          contacts: true,
          _count: {
            select: {
              leadLinks: true
            }
          }
        }
      },
      organizationLinks: {
        include: {
          organization: {
            include: {
              _count: {
                select: {
                  leadLinks: true
                }
              }
            }
          }
        }
      },
      activities: {
        orderBy: {
          activityAt: "desc"
        },
        take: 12
      },
      reviewFlags: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!lead) {
    return null;
  }

  const recentChanges = await prisma.changeLog.findMany({
    where: {
      OR: [
        {
          entityType: "Lead",
          entityId: lead.id
        },
        {
          entityType: "Permit",
          entityId: lead.permitId
        }
      ]
    },
    orderBy: {
      changedAt: "desc"
    },
    take: 8
  });

  return {
    ...lead,
    recentChanges
  };
}

export async function listLeadQueue(input: {
  view?: "all" | "review_now" | "qualified_pipeline" | "follow_up" | "recent" | "high_priority";
  city?: string;
  jurisdiction?: string;
  permitType?: string;
  leadType?: LeadType | "";
  status?: LeadStatus | "";
  organization?: string;
  query?: string;
  minScore?: number;
  maxScore?: number;
  issueDateFrom?: string;
  issueDateTo?: string;
  sourceId?: string;
  sort?:
    | "newest"
    | "highest_score"
    | "valuation"
    | "builder_momentum"
    | "recently_changed";
}) {
  const viewFilter =
    input.view === "review_now"
      ? {
          status: {
            in: ["new", "review"] as LeadStatus[]
          },
          overallScore: {
            gte: 70
          }
        }
      : input.view === "qualified_pipeline"
        ? {
            status: {
              in: ["qualified", "contacted", "estimating", "bid_sent"] as LeadStatus[]
            }
          }
        : input.view === "follow_up"
          ? {
              nextActionState: {
                in: ["open", "waiting"] as NextActionState[]
              }
            }
          : input.view === "recent"
            ? {
                firstSeenAt: {
                  gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
                }
              }
            : input.view === "high_priority"
              ? {
                  overallScore: {
                    gte: 80
                  }
                }
              : {};

  const viewScoreFilter =
    "overallScore" in viewFilter && typeof viewFilter.overallScore === "object" ? viewFilter.overallScore : undefined;
  const viewStatusFilter =
    "status" in viewFilter && typeof viewFilter.status === "object" ? viewFilter.status : undefined;

  const where: Prisma.LeadWhereInput = {
    ...viewFilter,
    status: input.status || viewStatusFilter,
    leadType: input.leadType || undefined,
    overallScore: {
      gte: input.minScore ?? viewScoreFilter?.gte,
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
      sourceId: input.sourceId || undefined,
      issueDate: input.issueDateFrom || input.issueDateTo
        ? {
            gte: input.issueDateFrom ? new Date(`${input.issueDateFrom}T00:00:00`) : undefined,
            lte: input.issueDateTo ? new Date(`${input.issueDateTo}T23:59:59`) : undefined
          }
        : undefined,
      permitType: input.permitType
        ? {
            contains: input.permitType,
            mode: "insensitive"
          }
        : undefined,
      source: input.jurisdiction
        ? {
            jurisdiction: {
              equals: input.jurisdiction,
              mode: "insensitive"
            }
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
      updatedAt: true,
      confidence: true,
      recommendedAction: true,
      nextAction: true,
      nextActionDueAt: true,
      nextActionState: true,
      assignedTo: true,
      firstSeenAt: true,
      lastActivityAt: true,
      permit: {
        select: {
          address1: true,
          city: true,
          state: true,
          permitNumber: true,
          permitType: true,
          issueDate: true,
          lastSeenAt: true,
          valuation: true,
          source: {
            select: {
              id: true,
              name: true,
              jurisdiction: true
            }
          }
        }
      },
      primaryOrg: {
        select: {
          name: true,
          _count: {
            select: {
              leadLinks: true
            }
          }
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
      activities: {
        take: 1,
        orderBy: {
          activityAt: "desc"
        },
        select: {
          activityType: true,
          activityAt: true
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
        nextActionState:
          input.status === "won" || input.status === "lost" || input.status === "archived"
            ? "done"
            : undefined,
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

export async function updateLeadNextAction(input: {
  id: string;
  nextAction?: string | null;
  nextActionState: NextActionState;
  nextActionDueAt?: Date | null;
  actor?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: input.id },
      data: {
        nextAction: input.nextAction || null,
        nextActionState: input.nextActionState,
        nextActionDueAt: input.nextActionDueAt ?? null,
        lastActivityAt: new Date()
      }
    });

    await tx.leadActivity.create({
      data: {
        leadId: input.id,
        activityType: "updated",
        activityAt: new Date(),
        actor: input.actor ?? "system",
        detail: input.nextAction
          ? `Next action set to "${input.nextAction}".`
          : "Next action cleared."
      }
    });

    return lead;
  });
}

export async function createLeadNote(input: {
  id: string;
  note: string;
  actor?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: input.id },
      data: {
        lastActivityAt: new Date()
      }
    });

    return tx.leadActivity.create({
      data: {
        leadId: input.id,
        activityType: "note",
        activityAt: new Date(),
        actor: input.actor ?? "system",
        detail: input.note
      }
    });
  });
}

export async function bulkUpdateLeadStatus(input: {
  ids: string[];
  status: LeadStatus;
  actor?: string;
}) {
  if (!input.ids.length) {
    return { count: 0 };
  }

  const timestamp = new Date();

  return prisma.$transaction(async (tx) => {
    const result = await tx.lead.updateMany({
      where: {
        id: {
          in: input.ids
        }
      },
      data: {
        status: input.status,
        nextActionState:
          input.status === "won" || input.status === "lost" || input.status === "archived"
            ? "done"
            : undefined,
        reviewedAt: timestamp,
        lastActivityAt: timestamp
      }
    });

    await tx.leadActivity.createMany({
      data: input.ids.map((id) => ({
        leadId: id,
        activityType: "reviewed" as ActivityType,
        activityAt: timestamp,
        actor: input.actor ?? "system",
        detail: `Bulk status update to ${input.status}.`
      }))
    });

    return result;
  });
}
