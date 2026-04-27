import Link from "next/link";
import { Archive, ExternalLink } from "lucide-react";

import { archiveLeadAction } from "@/app/actions/lead-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { getLeadQueue } from "@/lib/domain/queries/leads";
import { formatIsoDate } from "@/lib/utils/date";

type LeadQueueItem = Awaited<ReturnType<typeof getLeadQueue>>[number];

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-emerald-100 text-emerald-800"
      : score >= 60
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{score}</span>;
}

export function LeadQueue({ leads }: { leads: LeadQueueItem[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:hidden">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{lead.permit.address1 ?? "No address"}</CardTitle>
                <CardDescription>
                  {lead.permit.city}, {lead.permit.state} · {lead.permit.permitType ?? "Unknown permit"}
                </CardDescription>
              </div>
              <ScorePill score={lead.overallScore} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{lead.leadType.replace("_", " ")}</Badge>
              <Badge>{lead.status}</Badge>
              <Badge>{lead.permit.source.jurisdiction}</Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{lead.recommendedAction}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium">{lead.primaryOrg?.name ?? "Builder missing"}</span>
              <div className="flex items-center gap-2">
                <form action={archiveLeadAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <Button type="submit" variant="outline" title="Archive lead">
                    <Archive className="h-4 w-4" />
                  </Button>
                </form>
                {isValidHttpUrl(lead.permit.permitUrl) ? (
                  <Button asChild variant="outline" title="Open source">
                    <a href={lead.permit.permitUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href={`/leads/${lead.id}`} prefetch={false}>
                    Open detail
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden xl:block">
        <div className="max-h-[760px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border/80 bg-card text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Jurisdiction</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Review flags</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/50 last:border-b-0">
                  <td className="px-4 py-4">
                    <div className="font-semibold">{lead.permit.address1 ?? "No address"}</div>
                    <div className="text-muted-foreground">
                      {lead.permit.permitNumber ?? "Unknown permit"} · {formatIsoDate(lead.permit.issueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-4">{lead.primaryOrg?.name ?? "Missing builder"}</td>
                  <td className="px-4 py-4">{lead.permit.source.jurisdiction}</td>
                  <td className="px-4 py-4 capitalize">{lead.leadType.replace("_", " ")}</td>
                  <td className="px-4 py-4">
                    <ScorePill score={lead.overallScore} />
                  </td>
                  <td className="px-4 py-4">
                    <Badge>{lead.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {lead.reviewFlags.length ? (
                        lead.reviewFlags.map((flag) => <Badge key={flag.id}>{flag.flag.replaceAll("_", " ")}</Badge>)
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <form action={archiveLeadAction}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <Button type="submit" variant="ghost" title="Archive lead">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </form>
                      {isValidHttpUrl(lead.permit.permitUrl) ? (
                        <Button asChild variant="ghost" title="Open source">
                          <a href={lead.permit.permitUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}
                      <Button asChild variant="ghost">
                        <Link href={`/leads/${lead.id}`} prefetch={false}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
