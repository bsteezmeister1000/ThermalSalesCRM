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
          contacts: true,
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
