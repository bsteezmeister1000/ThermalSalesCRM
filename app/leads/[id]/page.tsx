import { notFound } from "next/navigation";

import { addLeadNoteAction, updateLeadNextActionAction, updateLeadWorkflowAction } from "@/app/actions/lead-actions";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getLeadDetail } from "@/lib/domain/queries/leads";
import {
  describeDueDate,
  formatActionState,
  formatLeadStatus,
  formatLeadType,
  formatShortDate,
  getActionStateTone,
  getLeadStatusTone,
  getPriorityLabel,
  getPriorityTone
} from "@/lib/presentation/leads";

function formatCurrency(value?: unknown) {
  if (value == null) {
    return "Unknown";
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return "Unknown";
  }

  return `$${amount.toLocaleString()}`;
}

export default async function LeadDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadDetail(id);
  if (!lead) {
    notFound();
  }

  const scoreReasons = Array.isArray(lead.scoreExplanationJson)
    ? (lead.scoreExplanationJson as Array<{ label: string; weight: number; detail?: string }>)
    : [];

  const stageShortcuts = ["review", "qualified", "contacted", "estimating", "bid_sent", "won", "lost"] as const;

  return (
    <AppShell pathname="/leads">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getLeadStatusTone(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
            <Badge>{formatLeadType(lead.leadType)}</Badge>
            <Badge className={getPriorityTone(lead.overallScore)}>
              {lead.overallScore} · {getPriorityLabel(lead.overallScore)}
            </Badge>
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-slate-950">{lead.permit.address1 ?? "Unknown address"}</h2>
          <CardDescription className="mt-3">
            {lead.permit.city}, {lead.permit.state} · {lead.permit.permitNumber ?? "No permit #"} · {lead.permit.source.jurisdiction}
          </CardDescription>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Primary company</p>
              <p className="mt-2 font-semibold text-slate-950">{lead.primaryOrg?.name ?? "Needs company review"}</p>
              <p className="mt-2 text-sm text-slate-500">
                {lead.primaryOrg?._count.leadLinks ?? 0} linked opportunities
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Suggested action</p>
              <p className="mt-2 font-semibold text-slate-950">{lead.recommendedAction ?? "Needs review"}</p>
              <p className="mt-2 text-sm text-slate-500">Assignee: {lead.assignedTo ?? "Unassigned"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Opportunity size</p>
              <p className="mt-2 font-semibold text-slate-950">{formatCurrency(lead.permit.valuation)}</p>
              <p className="mt-2 text-sm text-slate-500">Confidence {lead.confidence}</p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardTitle>Move the lead forward</CardTitle>
          <CardDescription className="mt-2">
            Use the next action and stage controls here instead of opening a larger edit form.
          </CardDescription>
          <div className="mt-5 flex flex-wrap gap-2">
            {stageShortcuts.map((status) => (
              <form key={status} action={updateLeadWorkflowAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="status" value={status} />
                <input type="hidden" name="note" value={`Stage advanced to ${status}.`} />
                <Button
                  type="submit"
                  variant={lead.status === status ? "default" : "outline"}
                  className={lead.status === status ? "bg-slate-900 text-white" : "border-slate-200"}
                >
                  {formatLeadStatus(status)}
                </Button>
              </form>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getActionStateTone(lead.nextActionState)}>
                {formatActionState(lead.nextActionState)}
              </Badge>
              <span className="text-sm text-slate-500">{describeDueDate(lead.nextActionDueAt)}</span>
            </div>
            <p className="mt-3 text-lg font-semibold text-slate-950">{lead.nextAction ?? "No next action set yet"}</p>
          </div>

          <form action={updateLeadNextActionAction} className="mt-5 grid gap-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <input
              type="text"
              name="nextAction"
              defaultValue={lead.nextAction ?? lead.recommendedAction ?? ""}
              placeholder="Call builder, send intro email, request plans..."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
            <div className="grid gap-3 md:grid-cols-[180px_180px_auto]">
              <select
                name="nextActionState"
                defaultValue={lead.nextActionState}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="open">Open</option>
                <option value="waiting">Waiting</option>
                <option value="done">Done</option>
              </select>
              <input
                type="date"
                name="nextActionDueAt"
                defaultValue={lead.nextActionDueAt ? lead.nextActionDueAt.toISOString().slice(0, 10) : ""}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
              <Button type="submit" className="bg-slate-900 text-white hover:opacity-95">
                Save next action
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <Card className="border-slate-200 bg-white">
            <CardTitle>Contacts and relationships</CardTitle>
            <div className="mt-4 space-y-3">
              {lead.organizationLinks.map((link) => (
                <div key={`${link.organizationId}-${link.relationshipType}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{link.organization.name}</p>
                      <p className="text-sm text-slate-500">
                        {link.organization.type} · {link.organization._count.leadLinks} linked leads
                      </p>
                    </div>
                    <Badge>{link.relationshipType}</Badge>
                  </div>
                </div>
              ))}
              {lead.primaryOrg?.contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm">
                  <p className="font-semibold text-slate-950">{contact.fullName}</p>
                  <p className="text-slate-500">{contact.roleTitle ?? "Public contact"}</p>
                  <p className="text-slate-500">{contact.email ?? contact.phone ?? "Manual verification needed"}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardTitle>Property and permit snapshot</CardTitle>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p>Parcel: {lead.property?.parcelNumber ?? lead.permit.parcelNumber ?? "Unknown"}</p>
              <p>Subdivision: {lead.property?.subdivision ?? "Unknown"}</p>
              <p>Neighborhood: {lead.property?.neighborhood ?? "Unknown"}</p>
              <p>Assessed value: {formatCurrency(lead.property?.assessedValue)}</p>
              <p>Permit type: {lead.permit.permitType ?? "Unknown"}</p>
              <p>Work class: {lead.permit.workClass ?? "Unknown"}</p>
            </div>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-slate-200 bg-white">
            <CardTitle>Recent changes and notes</CardTitle>
            <div className="mt-4 space-y-3">
              {lead.recentChanges.map((change) => (
                <div key={change.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{change.entityType}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {formatShortDate(change.changedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {Array.isArray(change.changedFieldsJson)
                      ? `Changed: ${change.changedFieldsJson.join(", ")}`
                      : "Change captured in log."}
                  </p>
                </div>
              ))}
              {lead.activities.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-dashed border-slate-300 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{activity.activityType}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {formatShortDate(activity.activityAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{activity.detail}</p>
                </div>
              ))}
            </div>

            <form action={addLeadNoteAction} className="mt-5 grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <textarea
                name="note"
                rows={3}
                placeholder="Quick note: call attempt, builder feedback, bid timing, missing info..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
              <div className="flex justify-end">
                <Button type="submit" variant="outline" className="border-slate-200">
                  Add note
                </Button>
              </div>
            </form>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardTitle>Scoring and provenance</CardTitle>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fit</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{lead.insulationFitScore}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{lead.revenuePotentialScore}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Relationship</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{lead.relationshipScore}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Freshness</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{lead.freshnessScore}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {scoreReasons.map((reason) => (
                <div key={`${reason.label}-${reason.weight}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-950">{reason.label}</p>
                    <Badge>{reason.weight > 0 ? `+${reason.weight}` : reason.weight}</Badge>
                  </div>
                  {reason.detail ? <p className="mt-2 text-sm text-slate-600">{reason.detail}</p> : null}
                </div>
              ))}
            </div>
            <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
                Source provenance and review flags
              </summary>
              <div className="space-y-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
                <p>Source URL: {lead.permit.permitUrl ?? "Fixture/manual source"}</p>
                <p>First seen: {formatShortDate(lead.firstSeenAt)}</p>
                <p>Last refreshed: {formatShortDate(lead.permit.lastSeenAt)}</p>
                <div className="flex flex-wrap gap-2">
                  {lead.reviewFlags.length ? (
                    lead.reviewFlags.map((flag) => <Badge key={flag.id}>{flag.flag.replaceAll("_", " ")}</Badge>)
                  ) : (
                    <span>No open flags</span>
                  )}
                </div>
              </div>
            </details>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
