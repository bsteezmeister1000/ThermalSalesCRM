import prisma from "@/lib/prisma";
import type { LeadStatus, LeadType, OrganizationType, Prisma, RelationshipType } from "@prisma/client";

import { normalizeAddress } from "@/lib/domain/normalization/address";
import { normalizeOrganizationName } from "@/lib/domain/normalization/organization";

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
  jurisdiction?: string;
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
    status: input.status || { not: "archived" },
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
      source: input.jurisdiction
        ? {
            jurisdiction: {
              contains: input.jurisdiction,
              mode: "insensitive"
            }
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
            { city: { contains: input.query, mode: "insensitive" } },
            { projectName: { contains: input.query, mode: "insensitive" } },
            { projectDescription: { contains: input.query, mode: "insensitive" } },
            {
              source: {
                jurisdiction: {
                  contains: input.query,
                  mode: "insensitive"
                }
              }
            }
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
          permitUrl: true,
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
            : [{ permit: { issueDate: "desc" } }, { firstSeenAt: "desc" }],
    take: 100
  });

  if (input.sort === "builder_momentum") {
    return [...leads].sort((a, b) => b._count.organizationLinks - a._count.organizationLinks);
  }

  return leads;
}

export async function listLeadFilterOptions() {
  const [cities, sources] = await Promise.all([
    prisma.permit.findMany({
      where: {
        city: {
          not: null
        }
      },
      distinct: ["city"],
      select: {
        city: true
      },
      orderBy: {
        city: "asc"
      }
    }),
    prisma.source.findMany({
      distinct: ["jurisdiction"],
      select: {
        jurisdiction: true
      },
      orderBy: {
        jurisdiction: "asc"
      }
    })
  ]);

  return {
    cities: cities.map((item) => item.city).filter((city): city is string => Boolean(city)),
    jurisdictions: sources.map((source) => source.jurisdiction)
  };
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

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseCurrency(value?: string | null) {
  const cleaned = clean(value)?.replace(/[$,]/g, "");
  if (!cleaned) {
    return undefined;
  }

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeEmail(value?: string | null) {
  return clean(value)?.toLowerCase();
}

export async function updateLeadEnrichment(input: {
  id: string;
  assignedTo?: string;
  reviewNotes?: string;
  recommendedAction?: string;
  permitType?: string;
  workClass?: string;
  projectDescription?: string;
  valuation?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  parcelNumber?: string;
  subdivision?: string;
  neighborhood?: string;
  propertyNotes?: string;
  organizationName?: string;
  organizationType?: OrganizationType;
  relationshipType?: RelationshipType;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  activityNote?: string;
  actor?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existingLead = await tx.lead.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        permit: true,
        property: true
      }
    });

    const address1 = clean(input.address1) ?? existingLead.permit.address1;
    const city = clean(input.city) ?? existingLead.permit.city;
    const state = clean(input.state) ?? existingLead.permit.state;
    const zip = clean(input.zip) ?? existingLead.permit.zip;
    const parcelNumber = clean(input.parcelNumber) ?? existingLead.permit.parcelNumber;
    const valuation = parseCurrency(input.valuation);

    let propertyId = existingLead.propertyId ?? undefined;
    if (address1 || existingLead.property) {
      const normalizedAddress = normalizeAddress({ address1, city, state, zip });
      const property = await tx.property.upsert({
        where: {
          normalizedAddressKey:
            existingLead.property?.normalizedAddressKey || normalizedAddress.normalizedKey
        },
        update: {
          address1: address1 ?? existingLead.property?.address1 ?? "",
          city: city ?? existingLead.property?.city ?? "",
          state: state ?? existingLead.property?.state ?? "IA",
          zip,
          parcelNumber,
          subdivision: clean(input.subdivision),
          neighborhood: clean(input.neighborhood),
          notes: clean(input.propertyNotes)
        },
        create: {
          normalizedAddressKey: normalizedAddress.normalizedKey,
          address1: address1 ?? "",
          city: city ?? "",
          state: state ?? "IA",
          zip,
          parcelNumber,
          subdivision: clean(input.subdivision),
          neighborhood: clean(input.neighborhood),
          notes: clean(input.propertyNotes)
        }
      });
      propertyId = property.id;
    }

    await tx.permit.update({
      where: { id: existingLead.permitId },
      data: {
        permitType: clean(input.permitType),
        workClass: clean(input.workClass),
        projectDescription: clean(input.projectDescription),
        valuation,
        address1,
        city,
        state,
        zip,
        parcelNumber,
        propertyId,
        lastSeenAt: new Date()
      }
    });

    let primaryOrgId = existingLead.primaryOrgId ?? undefined;
    const organizationName = clean(input.organizationName);
    if (organizationName) {
      const organization = await tx.organization.upsert({
        where: {
          normalizedName: normalizeOrganizationName(organizationName)
        },
        update: {
          name: organizationName,
          type: input.organizationType ?? "builder",
          confidence: 78,
          lastSeenAt: new Date()
        },
        create: {
          name: organizationName,
          normalizedName: normalizeOrganizationName(organizationName),
          type: input.organizationType ?? "builder",
          confidence: 78,
          aliasesJson: [organizationName],
          lastSeenAt: new Date()
        }
      });
      primaryOrgId = organization.id;

      await tx.leadOrganizationLink.upsert({
        where: {
          leadId_organizationId_relationshipType: {
            leadId: input.id,
            organizationId: organization.id,
            relationshipType: input.relationshipType ?? "builder"
          }
        },
        update: {
          confidence: 78
        },
        create: {
          leadId: input.id,
          organizationId: organization.id,
          relationshipType: input.relationshipType ?? "builder",
          confidence: 78
        }
      });

      const contactName = clean(input.contactName);
      const contactEmail = normalizeEmail(input.contactEmail);
      const contactPhone = clean(input.contactPhone);
      if (contactName || contactEmail || contactPhone) {
        const contactData = {
          fullName: contactName ?? contactEmail ?? contactPhone ?? "Public contact",
          roleTitle: clean(input.contactTitle),
          email: contactEmail,
          normalizedEmail: contactEmail,
          phone: contactPhone,
          source: "manual_enrichment",
          confidence: 75,
          lastVerifiedAt: new Date()
        };

        if (contactEmail) {
          await tx.personContact.upsert({
            where: {
              organizationId_normalizedEmail: {
                organizationId: organization.id,
                normalizedEmail: contactEmail
              }
            },
            update: contactData,
            create: {
              organizationId: organization.id,
              ...contactData
            }
          });
        } else {
          await tx.personContact.create({
            data: {
              organizationId: organization.id,
              ...contactData
            }
          });
        }
      }
    }

    const detail =
      clean(input.activityNote) ||
      "Lead enriched with manually reviewed permit, property, organization, or contact information.";

    const lead = await tx.lead.update({
      where: { id: input.id },
      data: {
        propertyId,
        primaryOrgId,
        assignedTo: clean(input.assignedTo),
        reviewNotes: clean(input.reviewNotes),
        recommendedAction: clean(input.recommendedAction),
        reviewedAt: new Date(),
        lastActivityAt: new Date(),
        reviewStateJson: {
          manuallyEnriched: true,
          enrichedAt: new Date().toISOString()
        }
      }
    });

    await tx.leadActivity.create({
      data: {
        leadId: input.id,
        activityType: "reviewed",
        activityAt: new Date(),
        actor: input.actor ?? "web",
        detail,
        metadataJson: {
          enrichment: true,
          organizationName,
          contactEmail: normalizeEmail(input.contactEmail)
        } as Prisma.InputJsonValue
      }
    });

    return lead;
  });
}
