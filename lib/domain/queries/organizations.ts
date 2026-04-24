import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";

export async function getOrganizations() {
  return unstable_cache(
    async () =>
      prisma.organization.findMany({
        orderBy: {
          leadLinks: {
            _count: "desc"
          }
        },
        include: {
          contacts: {
            take: 3,
            orderBy: {
              lastVerifiedAt: "desc"
            }
          },
          contactMethods: {
            take: 3,
            orderBy: [{ isPrimary: "desc" }, { confidence: "desc" }]
          },
          sourceRecords: {
            take: 3,
            orderBy: { lastSeenAt: "desc" }
          },
          leadLinks: {
            include: {
              lead: {
                select: {
                  overallScore: true,
                  status: true,
                  permit: {
                    select: {
                      city: true
                    }
                  }
                }
              }
            },
            take: 12
          },
          _count: {
            select: {
              leadLinks: true
            }
          }
        }
      }),
    ["organizations-list"],
    { revalidate: 60 }
  )();
}

export async function getOrganizationDetail(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      contacts: true,
      contactMethods: {
        orderBy: [{ isPrimary: "desc" }, { confidence: "desc" }]
      },
      sourceRecords: {
        orderBy: { lastSeenAt: "desc" },
        take: 12,
        include: {
          source: true
        }
      },
      leadLinks: {
        include: {
          lead: {
            include: {
              permit: true
            }
          }
        }
      }
    }
  });
}
