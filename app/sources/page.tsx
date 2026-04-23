import { AppShell } from "@/components/layout/app-shell";
import { SourceHealthTable } from "@/components/sources/source-health-table";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getJobLogs, getSourcesWithHealth } from "@/lib/domain/queries/sources";

export default async function SourcesPage() {
  const [sources, jobs] = await Promise.all([getSourcesWithHealth(), getJobLogs()]);

  return (
    <AppShell pathname="/sources">
      <Card>
        <CardTitle>Sources & health</CardTitle>
        <CardDescription className="mt-2">
          Each adapter is isolated, health-checked, and allowed to degrade without poisoning the rest of the workflow.
        </CardDescription>
      </Card>
      <SourceHealthTable sources={sources} />
      <Card>
        <CardTitle>Job log</CardTitle>
        <div className="mt-5 space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl bg-secondary/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">
                  {job.jobType} {job.source ? `· ${job.source.name}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{job.status}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Started {job.startedAt.toISOString()} · rows fetched {job.rowsFetched} · rows parsed {job.rowsParsed}
              </p>
              {job.errorMessage ? <p className="mt-2 text-sm text-orange-700">{job.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
