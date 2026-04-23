import Link from "next/link";

import { bulkUpdateLeadWorkflowAction, updateLeadWorkflowAction } from "@/app/actions/lead-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { getLeadQueue } from "@/lib/domain/queries/leads";
import {
  describeDueDate,
  describeRecentChange,
  formatActionState,
  formatLeadStatus,
  formatLeadType,
  formatShortDate,
  getActionStateTone,
  getLeadStatusTone,
  getPriorityLabel,
  getPriorityTone
} from "@/lib/presentation/leads";

type LeadQueueItem = Awaited<ReturnType<typeof getLeadQueue>>[number];

function ScorePill({ score }: { score: number }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getPriorityTone(score)}`}>
      {score} · {getPriorityLabel(score)}
    </span>
  );
}

function StatusPill({ status }: { status: LeadQueueItem["status"] }) {
  return <Badge className={getLeadStatusTone(status)}>{formatLeadStatus(status)}</Badge>;
}

function RowActions({ leadId, currentStatus }: { leadId: string; currentStatus: LeadQueueItem["status"] }) {
  const quickStatuses = [
    { value: "review", label: "Review now" },
    { value: "qualified", label: "Qualify" },
    { value: "contacted", label: "Mark contacted" },
    { value: "lost", label: "Not relevant" }
  ] as const;

  return (
    <details className="group relative">
      <summary className="list-none">
        <span className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
          Actions
        </span>
      </summary>
      <div className="absolute right-0 top-12 z-20 w-64 rounded-3xl border border-slate-200 bg-white p-3 shadow-panel">
        <div className="space-y-2">
          {quickStatuses.map((status) => (
            <form key={status.value} action={updateLeadWorkflowAction}>
              <input type="hidden" name="leadId" value={leadId} />
              <input type="hidden" name="status" value={status.value} />
              <input type="hidden" name="note" value={`Queue quick action: ${status.label}.`} />
              <button
                type="submit"
                disabled={currentStatus === status.value}
                className="w-full rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.label}
              </button>
            </form>
          ))}
        </div>
      </div>
    </details>
  );
}

function EmptyQueueState() {
  return (
    <Card className="border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <p className="text-lg font-semibold text-slate-900">No leads match this view right now.</p>
      <p className="mt-2 text-sm text-slate-500">
        Try widening the filters or jump back to All leads to continue triage.
      </p>
    </Card>
  );
}

export function LeadQueue({ leads }: { leads: LeadQueueItem[] }) {
  if (!leads.length) {
    return <EmptyQueueState />;
  }

  return (
    <div className="space-y-4">
      <form
        id="bulk-lead-update-form"
        action={bulkUpdateLeadWorkflowAction}
        className="hidden items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 xl:flex"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Bulk triage</p>
          <p className="text-xs text-slate-500">Select leads in the queue, then move them forward in one step.</p>
        </div>
        <div className="flex items-center gap-3">
          <select name="status" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
            <option value="review">Move to review</option>
            <option value="qualified">Move to qualified</option>
            <option value="contacted">Move to contacted</option>
            <option value="lost">Mark not relevant</option>
            <option value="archived">Archive</option>
          </select>
          <Button type="submit" className="bg-slate-900 text-white hover:opacity-95">
            Apply to selected
          </Button>
        </div>
      </form>

      <div className="grid gap-4 xl:hidden">
        {leads.map((lead) => {
          const recentChange = describeRecentChange({
            firstSeenAt: lead.firstSeenAt,
            updatedAt: lead.updatedAt,
            permitLastSeenAt: lead.permit.lastSeenAt,
            latestActivityType: lead.activities[0]?.activityType,
            unresolvedFlags: lead.reviewFlags.map((flag) => flag.flag)
          });

          return (
            <Card key={lead.id} className="border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/leads/${lead.id}`} prefetch={false} className="text-lg font-semibold text-slate-900">
                    {lead.permit.address1 ?? "No address"}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {lead.permit.city}, {lead.permit.state} · {lead.primaryOrg?.name ?? "Builder missing"}
                  </p>
                </div>
                <ScorePill score={lead.overallScore} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill status={lead.status} />
                <Badge>{formatLeadType(lead.leadType)}</Badge>
                <Badge className={getActionStateTone(lead.nextActionState)}>
                  {formatActionState(lead.nextActionState)}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Next:</span>{" "}
                  {lead.nextAction ?? lead.recommendedAction ?? "Set next action"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Recent change:</span> {recentChange}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {describeDueDate(lead.nextActionDueAt)}
                </span>
                <RowActions leadId={lead.id} currentStatus={lead.status} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="hidden overflow-hidden border-slate-200 bg-white xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Next action</th>
                <th className="px-4 py-3">Recent change</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const recentChange = describeRecentChange({
                  firstSeenAt: lead.firstSeenAt,
                  updatedAt: lead.updatedAt,
                  permitLastSeenAt: lead.permit.lastSeenAt,
                  latestActivityType: lead.activities[0]?.activityType,
                  unresolvedFlags: lead.reviewFlags.map((flag) => flag.flag)
                });

                return (
                  <tr key={lead.id} className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/60">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        form="bulk-lead-update-form"
                        name="leadIds"
                        value={lead.id}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/leads/${lead.id}`} prefetch={false} className="font-semibold text-slate-900">
                        {lead.permit.address1 ?? "No address"}
                      </Link>
                      <div className="mt-1 text-slate-500">
                        {lead.permit.city}, {lead.permit.state} · {formatLeadType(lead.leadType)} · issued {formatShortDate(lead.permit.issueDate)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{lead.primaryOrg?.name ?? "Builder missing"}</div>
                      <div className="mt-1 text-slate-500">
                        {lead.primaryOrg?._count.leadLinks ?? 0} linked opportunities · {lead.permit.source.jurisdiction}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <ScorePill score={lead.overallScore} />
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Confidence {lead.confidence}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <StatusPill status={lead.status} />
                        {lead.reviewFlags.length ? (
                          <p className="text-xs text-rose-700">{lead.reviewFlags.length} review flag(s)</p>
                        ) : (
                          <p className="text-xs text-slate-500">No open flags</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[220px]">
                        <p className="font-medium text-slate-900">{lead.nextAction ?? lead.recommendedAction ?? "Set next action"}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className={getActionStateTone(lead.nextActionState)}>
                            {formatActionState(lead.nextActionState)}
                          </Badge>
                          <span className="text-xs text-slate-500">{describeDueDate(lead.nextActionDueAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[220px]">
                        <p className="font-medium text-slate-900">{recentChange}</p>
                        <p className="mt-1 text-slate-500">Last activity {formatShortDate(lead.lastActivityAt)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {lead.permit.valuation ? `$${Number(lead.permit.valuation).toLocaleString()}` : "Unknown"}
                      </div>
                      <p className="mt-1 text-slate-500">{lead.assignedTo ?? "Unassigned"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost">
                          <Link href={`/leads/${lead.id}`} prefetch={false}>
                            Open
                          </Link>
                        </Button>
                        <RowActions leadId={lead.id} currentStatus={lead.status} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
