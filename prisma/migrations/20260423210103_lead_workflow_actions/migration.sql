-- CreateEnum
CREATE TYPE "NextActionState" AS ENUM ('open', 'waiting', 'done');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextActionDueAt" TIMESTAMP(3),
ADD COLUMN     "nextActionState" "NextActionState" NOT NULL DEFAULT 'open';

-- CreateIndex
CREATE INDEX "Lead_nextActionState_nextActionDueAt_idx" ON "Lead"("nextActionState", "nextActionDueAt");
