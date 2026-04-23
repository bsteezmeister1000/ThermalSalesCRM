import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { getPermitList } from "@/lib/domain/queries/permits";
import { formatLeadStatus, formatShortDate, getLeadStatusTone, getPriorityTone } from "@/lib/presentation/leads";

type PermitListData = Awaited<ReturnType<typeof getPermitList>>;
type PermitItem = PermitListData["permits"][number];

function formatCurrency(value: unknown) {
  if (value == null) {
    return "Unknown";
  }

  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toLocaleString()}` : "Unknown";
}

function RadiusBadge({ permit }: { permit: PermitItem }) {
  if (permit.radiusMatch.confidence === "exact") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800">
        {Math.round(permit.radiusMatch.miles ?? 0)} mi exact
      </Badge>
    );
  }

  if (permit.radiusMatch.confidence === "approx_city") {
    return (
      <Badge className="bg-amber-100 text-amber-800">
        {Math.round(permit.radiusMatch.miles ?? 0)} mi city est.
      </Badge>
    );
  }

  return <Badge className="bg-zinc-100 text-zinc-700">Location unknown</Badge>;
}

export function PermitTable({ permits }: { permits: PermitListData["permits"] }) {
  if (!permits.length) {
    return (
      <Card className="border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-lg font-semibold text-slate-900">No permits match the current radius and filters.</p>
        <p className="mt-2 text-sm text-slate-500">
          Try allowing city-estimated matches or widening the search terms.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Permit</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Builder / org</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {permits.map((permit) => (
              <tr key={permit.id} className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <Link href={`/permits/${permit.id}`} className="font-semibold text-slate-900" prefetch={false}>
                    {permit.permitNumber ?? "Unknown permit"}
                  </Link>
                  <p className="mt-1 text-slate-500">
                    {formatShortDate(permit.issueDate)} · {permit.status ?? "Unknown status"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{permit.permitType ?? "Unknown type"}</p>
                  <p className="mt-1 text-slate-500">{permit.workClass ?? "Unknown work class"}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatCurrency(permit.valuation)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{permit.address1 ?? "Unknown address"}</p>
                  <p className="mt-1 text-slate-500">{permit.city ?? "Unknown city"}, {permit.state ?? "Unknown state"}</p>
                  <div className="mt-2">
                    <RadiusBadge permit={permit} />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{permit.source.name}</p>
                  <p className="mt-1 text-slate-500">{permit.source.jurisdiction}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{permit.linkedOrganization ?? "No linked organization"}</p>
                </td>
                <td className="px-4 py-4">
                  {permit.lead ? (
                    <div className="space-y-2">
                      <Badge className={getLeadStatusTone(permit.lead.status as never)}>
                        {formatLeadStatus(permit.lead.status as never)}
                      </Badge>
                      <Badge className={getPriorityTone(permit.score ?? 0)}>{permit.score}</Badge>
                    </div>
                  ) : (
                    <span className="text-slate-500">Not converted</span>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-600">{formatShortDate(permit.lastSeenAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost">
                      <Link href={`/permits/${permit.id}`} prefetch={false}>
                        Open
                      </Link>
                    </Button>
                    {permit.lead ? (
                      <Button asChild variant="outline" className="border-slate-200">
                        <Link href={`/leads/${permit.lead.id}`} prefetch={false}>
                          Lead
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
