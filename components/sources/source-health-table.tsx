import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { getSourcesWithHealth } from "@/lib/domain/queries/sources";

type SourceItem = Awaited<ReturnType<typeof getSourcesWithHealth>>[number];

function formatDateTime(value?: Date | null) {
  return value ? value.toISOString().replace("T", " ").slice(0, 16) : "Never";
}

export function SourceHealthTable({ sources }: { sources: SourceItem[] }) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last run</th>
              <th className="px-4 py-3">Records</th>
              <th className="px-4 py-3">Permits</th>
              <th className="px-4 py-3">Latest job</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-slate-100 align-top last:border-b-0">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{source.name}</p>
                  <p className="mt-1 text-slate-500">
                    {source.jurisdiction} · {source.type} · {source.enabled ? "Enabled" : "Manual only"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <Badge>{source.healthStatus}</Badge>
                </td>
                <td className="px-4 py-4 text-slate-600">{formatDateTime(source.lastRunAt)}</td>
                <td className="px-4 py-4 text-slate-900">{source._count.rawRecords}</td>
                <td className="px-4 py-4 text-slate-900">{source._count.permits}</td>
                <td className="px-4 py-4 text-slate-600">
                  {source.syncJobRuns.length ? (
                    <>
                      <p>{source.syncJobRuns[0].jobType}</p>
                      <p>{source.syncJobRuns[0].status}</p>
                    </>
                  ) : (
                    "No jobs yet"
                  )}
                </td>
                <td className="px-4 py-4 text-slate-600">{source.notes ?? "No notes"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
