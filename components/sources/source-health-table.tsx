import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { getSourcesWithHealth } from "@/lib/domain/queries/sources";

type SourceItem = Awaited<ReturnType<typeof getSourcesWithHealth>>[number];

export function SourceHealthTable({ sources }: { sources: SourceItem[] }) {
  return (
    <div className="grid gap-4">
      {sources.map((source) => (
        <Card key={source.id}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>{source.name}</CardTitle>
              <CardDescription className="mt-2">
                {source.jurisdiction} · {source.type} · {source.enabled ? "Enabled" : "Manual only"}
              </CardDescription>
            </div>
            <Badge>{source.healthStatus}</Badge>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last run</p>
              <p className="mt-1 text-sm font-semibold">
                {source.lastRunAt ? source.lastRunAt.toISOString() : "Never"}
              </p>
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
