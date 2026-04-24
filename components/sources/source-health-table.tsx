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
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Freshness</th>
              <th className="px-4 py-3">Last sync</th>
              <th className="px-4 py-3">Coverage</th>
              <th className="px-4 py-3">Completeness</th>
              <th className="px-4 py-3">Latest issue</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-slate-100 align-top last:border-b-0">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{source.name}</p>
                  <p className="mt-1 text-slate-500">
                    {source.jurisdiction} · {source.type} · {source.activeStatus.replaceAll("_", " ")}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{source.accessMethod.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-slate-500">{source.parserName ?? "No parser yet"}</p>
                </td>
                <td className="px-4 py-4">
                  <Badge>{source.healthStatus}</Badge>
                  <p className="mt-2 text-xs text-slate-500">
                    conf. {source.sourceConfidence} · parse err {source.parseErrorRate.toFixed(1)}%
                  </p>
                </td>
                <td className="px-4 py-4">
                  <Badge>{source.freshnessStatus}</Badge>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <p>{formatDateTime(source.lastSuccessfulSyncAt ?? source.lastSuccessAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">checked {formatDateTime(source.checkedAt)}</p>
                </td>
                <td className="px-4 py-4 text-slate-900">
                  <p>{source.rowCountLastSync} rows</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {source._count.rawRecords} raw · {source._count.permits} permits · {source._count.organizationSourceRecords} builders
                  </p>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {source.completenessStatsJson ? (
                    <>
                      <p>{String((source.completenessStatsJson as { percentWithAddress?: number }).percentWithAddress ?? 0)}% addr</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {String(
                          (source.completenessStatsJson as { percentWithContractorBuilder?: number }).percentWithContractorBuilder ?? 0
                        )}
                        % builder
                      </p>
                    </>
                  ) : (
                    "No stats yet"
                  )}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {source.diagnostics.length ? (
                    <>
                      <p className="font-medium text-slate-900">{source.diagnostics[0].title}</p>
                      <p className="mt-1 text-xs text-slate-500">{source.diagnostics[0].issueType.replaceAll("_", " ")}</p>
                    </>
                  ) : source.syncJobRuns.length ? (
                    <>
                      <p>{source.syncJobRuns[0].jobType}</p>
                      <p className="mt-1 text-xs text-slate-500">{source.syncJobRuns[0].status}</p>
                    </>
                  ) : (
                    "No issues"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
