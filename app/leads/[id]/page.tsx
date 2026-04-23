import { notFound } from "next/navigation";

import { updateLeadWorkflowAction } from "@/app/actions/lead-actions";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getLeadDetail } from "@/lib/domain/queries/leads";

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

  return (
    <AppShell pathname="/leads">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{lead.status}</Badge>
            <Badge>{lead.leadType.replaceAll("_", " ")}</Badge>
            <Badge>{lead.overallScore} overall</Badge>
          </div>
          <h2 className="mt-5 text-3xl font-semibold">{lead.permit.address1 ?? "Unknown address"}</h2>
          <CardDescription className="mt-3">
            {lead.permit.city}, {lead.permit.state} · {lead.permit.permitNumber} · {lead.permit.source.jurisdiction}
          </CardDescription>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recommended action</p>
              <p className="mt-2 font-semibold">{lead.recommendedAction}</p>
            </div>
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Source provenance</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Raw and normalized data stay separate. Permit source URL: {lead.permit.permitUrl ?? "fixture/manual"}.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fit</p>
              <p className="mt-1 text-2xl font-semibold">{lead.insulationFitScore}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Revenue</p>
              <p className="mt-1 text-2xl font-semibold">{lead.revenuePotentialScore}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Relationship</p>
              <p className="mt-1 text-2xl font-semibold">{lead.relationshipScore}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Freshness</p>
              <p className="mt-1 text-2xl font-semibold">{lead.freshnessScore}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Score explanation</CardTitle>
          <div className="mt-5 space-y-3">
            {scoreReasons.map((reason) => (
              <div key={`${reason.label}-${reason.weight}`} className="rounded-2xl bg-secondary/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">{reason.label}</p>
                  <Badge>{reason.weight > 0 ? `+${reason.weight}` : reason.weight}</Badge>
                </div>
                {reason.detail ? (
                  <p className="mt-2 text-sm text-muted-foreground">{reason.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card>
          <CardTitle>Workflow actions</CardTitle>
          <CardDescription className="mt-2">
            Update the CRM status directly from the lead record. This writes through Prisma and appends activity history.
          </CardDescription>
          <form action={updateLeadWorkflowAction} className="mt-5 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
            <input type="hidden" name="leadId" value={lead.id} />
            <select
              name="status"
              defaultValue={lead.status}
              className="rounded-2xl border bg-white px-4 py-3"
            >
              <option value="new">New</option>
              <option value="review">Review</option>
              <option value="qualified">Qualified</option>
              <option value="contacted">Contacted</option>
              <option value="estimating">Estimating</option>
              <option value="bid_sent">Bid sent</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="archived">Archived</option>
            </select>
            <input
              type="text"
              name="note"
              placeholder="Optional note for the activity log"
              className="rounded-2xl border bg-white px-4 py-3"
            />
            <Button type="submit">Save status</Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <Card>
          <CardTitle>Property</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <p>Parcel: {lead.property?.parcelNumber ?? lead.permit.parcelNumber ?? "Unknown"}</p>
            <p>Subdivision: {lead.property?.subdivision ?? "Unknown"}</p>
            <p>Neighborhood: {lead.property?.neighborhood ?? "Unknown"}</p>
            <p>Assessed value: {lead.property?.assessedValue?.toString() ?? "Unknown"}</p>
          </div>
        </Card>

        <Card>
          <CardTitle>Organizations & contacts</CardTitle>
          <div className="mt-4 space-y-4">
            {lead.organizationLinks.map((link) => (
              <div key={`${link.organizationId}-${link.relationshipType}`} className="rounded-2xl bg-secondary/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{link.organization.name}</p>
                  <Badge>{link.relationshipType}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{link.organization.type}</p>
              </div>
            ))}
            {lead.primaryOrg?.contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-dashed p-4 text-sm">
                <p className="font-semibold">{contact.fullName}</p>
                <p className="text-muted-foreground">{contact.roleTitle ?? "Public contact"}</p>
                <p className="text-muted-foreground">{contact.email ?? contact.phone ?? "Manual verification needed"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Review flags & history</CardTitle>
          <div className="mt-4 space-y-3">
            {lead.reviewFlags.map((flag) => (
              <div key={flag.id} className="rounded-2xl bg-secondary/70 p-4">
                <p className="font-semibold">{flag.flag.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{flag.detail ?? "No detail provided."}</p>
              </div>
            ))}
            {lead.activities.map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-dashed p-4">
                <p className="text-sm font-semibold">{activity.activityType}</p>
                <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
