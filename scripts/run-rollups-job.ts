import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

async function main() {
  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          leadLinks: true
        }
      }
    }
  });

  for (const organization of organizations) {
    await prisma.changeLog.create({
      data: {
        entityType: "Organization",
        entityId: organization.id,
        changedFieldsJson: ["momentum"],
        previousValueJson: Prisma.JsonNull,
        newValueJson: {
          activeLeadLinks: organization._count.leadLinks
        } as Prisma.InputJsonValue,
        changedAt: new Date(),
        actor: "weekly_rollup_rebuild"
      }
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
