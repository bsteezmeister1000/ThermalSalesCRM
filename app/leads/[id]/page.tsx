import { notFound } from "next/navigation";

import { archiveLeadAction, updateLeadEnrichmentAction, updateLeadWorkflowAction } from "@/app/actions/lead-actions";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getLeadDetail } from "@/lib/domain/queries/leads";

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

function formatProvenanceValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function ClickableValue({ value }: { value: unknown }) {
  if (isValidHttpUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
      >
        Open source
      </a>
    );
  }

  return <span>{formatProvenanceValue(value)}</span>;
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
  const primaryContact = lead.primaryOrg?.contacts[0];
  const provenance =
    lead.permit.provenanceJson && typeof lead.permit.provenanceJson === "object" && !Array.isArray(lead.permit.provenanceJson)
      ? (lead.permit.provenanceJson as Record<string, unknown>)
      : {};
  const provenanceEntries = Object.entries(provenance);

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
              <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>Source</span>
                  <ClickableValue value={lead.permit.permitUrl ?? "fixture/manual"} />
                </div>
                {provenanceEntries.length ? (
                  <details className="group rounded-xl border border-border/60 bg-white/50 px-3 py-2">
                    <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden">
                      <span className="inline-flex w-full items-center justify-between gap-3">
                        <span>Provenance details</span>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground group-open:hidden">
                          Expand
                        </span>
                        <span className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground group-open:inline">
                          Collapse
                        </span>
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      {provenanceEntries.map(([key, value]) => (
                        <div key={key} className="flex flex-wrap items-center justify-between gap-3">
                          <span className="capitalize">{key.replaceAll("_", " ")}</span>
                          <span className="max-w-full break-words text-right">
                            <ClickableValue value={value} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
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
          <form action={archiveLeadAction} className="mt-3 flex justify-end">
            <input type="hidden" name="leadId" value={lead.id} />
            <Button type="submit" variant="outline">Archive lead</Button>
          </form>
        </Card>
      </section>

      <section>
        <Card>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>Edit scraped lead details</CardTitle>
              <CardDescription className="mt-2">
                Add reviewed information without changing the preserved raw source record. Updates here enrich the CRM lead, permit, property, organization, and contact records.
              </CardDescription>
            </div>
            <Badge>Manual enrichment</Badge>
          </div>

          <form action={updateLeadEnrichmentAction} className="mt-6 grid gap-6">
            <input type="hidden" name="leadId" value={lead.id} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Assigned to
                <input
                  name="assignedTo"
                  defaultValue={lead.assignedTo ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold xl:col-span-2">
                Recommended action
                <input
                  name="recommendedAction"
                  defaultValue={lead.recommendedAction ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm font-semibold">
                Permit type
                <input
                  name="permitType"
                  defaultValue={lead.permit.permitType ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Work class
                <input
                  name="workClass"
                  defaultValue={lead.permit.workClass ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Valuation
                <input
                  name="valuation"
                  inputMode="decimal"
                  defaultValue={lead.permit.valuation?.toString() ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Parcel
                <input
                  name="parcelNumber"
                  defaultValue={lead.property?.parcelNumber ?? lead.permit.parcelNumber ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm font-semibold xl:col-span-2">
                Address
                <input
                  name="address1"
                  defaultValue={lead.permit.address1 ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                City
                <input
                  name="city"
                  defaultValue={lead.permit.city ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                State
                <input
                  name="state"
                  defaultValue={lead.permit.state ?? "IA"}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                ZIP
                <input
                  name="zip"
                  defaultValue={lead.permit.zip ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Subdivision
                <input
                  name="subdivision"
                  defaultValue={lead.property?.subdivision ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Neighborhood
                <input
                  name="neighborhood"
                  defaultValue={lead.property?.neighborhood ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Project description
                <textarea
                  name="projectDescription"
                  rows={4}
                  defaultValue={lead.permit.projectDescription ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Review notes
                <textarea
                  name="reviewNotes"
                  rows={4}
                  defaultValue={lead.reviewNotes ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm font-semibold xl:col-span-2">
                Builder / GC
                <input
                  name="organizationName"
                  defaultValue={lead.primaryOrg?.name ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Organization type
                <select
                  name="organizationType"
                  defaultValue={lead.primaryOrg?.type ?? "builder"}
                  className="rounded-2xl border bg-white px-4 py-3"
                >
                  <option value="builder">Builder</option>
                  <option value="general_contractor">General contractor</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="developer">Developer</option>
                  <option value="owner">Owner</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Relationship
                <select
                  name="relationshipType"
                  defaultValue={lead.organizationLinks[0]?.relationshipType ?? "builder"}
                  className="rounded-2xl border bg-white px-4 py-3"
                >
                  <option value="builder">Builder</option>
                  <option value="gc">GC</option>
                  <option value="contractor">Contractor</option>
                  <option value="owner">Owner</option>
                  <option value="applicant">Applicant</option>
                  <option value="inferred">Inferred</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-sm font-semibold">
                Contact name
                <input
                  name="contactName"
                  defaultValue={primaryContact?.fullName ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Contact title
                <input
                  name="contactTitle"
                  defaultValue={primaryContact?.roleTitle ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Contact email
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={primaryContact?.email ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Contact phone
                <input
                  name="contactPhone"
                  defaultValue={primaryContact?.phone ?? ""}
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <label className="grid gap-2 text-sm font-semibold">
                Activity note
                <input
                  name="activityNote"
                  placeholder="What did you verify or add?"
                  className="rounded-2xl border bg-white px-4 py-3"
                />
              </label>
              <Button type="submit">Save lead details</Button>
            </div>
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
