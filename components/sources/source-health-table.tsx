import { runSourceAdapterAction } from "@/app/actions/source-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { getSourcesWithHealth } from "@/lib/domain/queries/sources";
import { formatIsoDateTime } from "@/lib/utils/date";

type SourceItem = Awaited<ReturnType<typeof getSourcesWithHealth>>[number];

function formatCadence(minutes: number | null) {
  if (!minutes) {
    return "Manual only";
  }

  if (minutes >= 60 * 24 * 28) {
    return "Monthly";
  }

  if (minutes >= 60 * 24 * 7) {
    return "Weekly";
  }

  if (minutes >= 60 * 24) {
    return "Daily";
  }

  return `Every ${minutes} min`;
}

export function SourceHealthTable({ sources }: { sources: SourceItem[] }) {
  return (
    <div className="grid gap-4">
      {sources.map((source) => (
        <Card key={source.id}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>{source.name}</CardTitle>
              <CardDescription className="mt-2">
                {source.jurisdiction} · {source.type} · {source.enabled ? "Enabled" : "Manual only"} ·{" "}
                {formatCadence(source.crawlFrequencyMinutes)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{source.healthStatus}</Badge>
              {source.supportsAutomation ? (
                <form action={runSourceAdapterAction}>
                  <input type="hidden" name="sourceKey" value={source.adapterKey} />
                  <Button type="submit" variant="outline">Run now</Button>
                </form>
              ) : null}
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last run</p>
              <p className="mt-1 text-sm font-semibold">
                {source.lastRunAt ? formatIsoDateTime(source.lastRunAt) : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cadence</p>
              <p className="mt-1 text-sm font-semibold">{formatCadence(source.crawlFrequencyMinutes)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Raw records</p>
              <p className="mt-1 text-sm font-semibold">{source._count.rawRecords}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Permits</p>
              <p className="mt-1 text-sm font-semibold">{source._count.permits}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm text-muted-foreground">{source.notes}</p>
            </div>
          </div>
          {source.syncJobRuns.length ? (
            <div className="mt-5 rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
              Latest job: {source.syncJobRuns[0].jobType} · {source.syncJobRuns[0].status} · rows fetched{" "}
              {source.syncJobRuns[0].rowsFetched}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
