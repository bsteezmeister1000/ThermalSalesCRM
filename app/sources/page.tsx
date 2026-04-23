import { AppShell } from "@/components/layout/app-shell";
import { SourceHealthTable } from "@/components/sources/source-health-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getJobLogs, getSourcesWithHealth } from "@/lib/domain/queries/sources";

export default async function SourcesPage() {
  const [sources, jobs] = await Promise.all([getSourcesWithHealth(), getJobLogs()]);
  const failedSources = sources.filter((source) => source.healthStatus === "failed").length;
  const manualSources = sources.filter((source) => !source.enabled || source.manualReviewOnly).length;

  return (
    <AppShell pathname="/sources">
      <Card className="border-slate-200 bg-white">
        <CardTitle>Source health</CardTitle>
        <CardDescription className="mt-2">
          Keep adapters honest: what ran, what failed, and what still needs manual review.
        </CardDescription>
        <div className="mt-5 flex flex-wrap gap-3">
          <Badge>{sources.length} configured</Badge>
          <Badge>{failedSources} failed</Badge>
          <Badge>{manualSources} manual or partial</Badge>
        </div>
      </Card>

      <SourceHealthTable sources={sources} />

      <Card className="border-slate-200 bg-white">
        <CardTitle>Recent job runs</CardTitle>
        <div className="mt-5 space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-slate-950">
                  {job.jobType} {job.source ? `· ${job.source.name}` : ""}
                </p>
                <Badge>{job.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Started {job.startedAt.toISOString()} · fetched {job.rowsFetched} · parsed {job.rowsParsed} · inserted{" "}
                {job.rowsInserted} · updated {job.rowsUpdated}
              </p>
              {job.errorMessage ? <p className="mt-2 text-sm text-rose-700">{job.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
