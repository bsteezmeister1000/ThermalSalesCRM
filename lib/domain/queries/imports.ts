import { prisma } from "@/lib/db/prisma";

export async function getManualImportSources() {
  return prisma.source.findMany({
    where: {
      OR: [{ manualReviewOnly: true }, { supportsAutomation: false }, { healthStatus: "manual_review" }]
    },
    orderBy: [{ jurisdiction: "asc" }, { name: "asc" }]
  });
}
