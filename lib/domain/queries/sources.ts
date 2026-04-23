import { listRecentSyncJobRuns } from "@/lib/repositories/sync-job-run-repository";
import { listSourcesWithLatestRuns } from "@/lib/repositories/source-repository";

export async function getSourcesWithHealth() {
  return listSourcesWithLatestRuns();
}

export async function getJobLogs() {
  return listRecentSyncJobRuns();
}
