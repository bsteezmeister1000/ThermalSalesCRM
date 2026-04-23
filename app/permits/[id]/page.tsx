import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getPermitDetail } from "@/lib/domain/queries/permits";
import { formatLeadStatus, formatShortDate, getLeadStatusTone, getPriorityTone } from "@/lib/presentation/leads";

function formatCurrency(value: unknown) {
  if (value == null) {
    return "Unknown";
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toLocaleString()}` : "Unknown";
}

export default async function PermitDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permit = await getPermitDetail(id);

  if (!permit) {
    notFound();
  }

  return (
    <AppShell pathname="/permits">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{permit.status ?? "Unknown status"}</Badge>
            <Badge>{permit.permitType ?? "Unknown type"}</Badge>
            {permit.lead ? (
              <Badge className={getLeadStatusTone(permit.lead.status)}>
                {formatLeadStatus(permit.lead.status)}
              </Badge>
            ) : (
              <Badge className="bg-zinc-100 text-zinc-700">No lead yet</Badge>
            )}
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-slate-950">{permit.address1 ?? "Unknown address"}</h2>
          <CardDescription className="mt-3">
            {permit.city}, {permit.state} · {permit.permitNumber ?? "No permit number"} · {permit.source.jurisdiction}
          </CardDescription>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Work class</p>
              <p className="mt-2 font-semibold text-slate-950">{permit.workClass ?? "Unknown"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Valuation</p>
              <p className="mt-2 font-semibold text-slate-950">{formatCurrency(permit.valuation)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Radius match</p>
              <p className="mt-2 font-semibold text-slate-950">
                {permit.radiusMatch.confidence === "unknown"
                  ? "Unknown"
                  : `${Math.round(permit.radiusMatch.miles ?? 0)} miles`}
              </p>
              <p className="mt-2 text-sm text-slate-500">{permit.radiusMatch.note}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {permit.permitUrl ? (
              <Button asChild variant="outline" className="border-slate-200">
                <a href={permit.permitUrl} target="_blank" rel="noreferrer">
                  Open source record
                </a>
              </Button>
            ) : null}
            {permit.lead ? (
              <Button asChild className="bg-slate-900 text-white hover:opacity-95">
                <Link href={`/leads/${permit.lead.id}`}>Open linked lead</Link>
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardTitle>Lead and relationship context</CardTitle>
          <div className="mt-4 space-y-3">
            {permit.lead ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Priority</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={getPriorityTone(permit.lead.overallScore)}>{permit.lead.overallScore}</Badge>
                    <span className="text-sm text-slate-600">{permit.lead.primaryOrg?.name ?? "No primary organization"}</span>
                  </div>
                </div>
                {permit.lead.organizationLinks.map((link) => (
                  <div key={`${link.organizationId}-${link.relationshipType}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{link.organization.name}</p>
                      <Badge>{link.relationshipType}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{link.organization.type}</p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-slate-500">This permit has not been converted into a reviewed lead yet.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200 bg-white">
          <CardTitle>Property and provenance</CardTitle>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Parcel: {permit.parcelNumber ?? permit.property?.parcelNumber ?? "Unknown"}</p>
            <p>Subdivision: {permit.property?.subdivision ?? "Unknown"}</p>
            <p>Neighborhood: {permit.property?.neighborhood ?? "Unknown"}</p>
            <p>Last seen: {formatShortDate(permit.lastSeenAt)}</p>
            <p>Issue date: {formatShortDate(permit.issueDate)}</p>
            <p>Source: {permit.source.name}</p>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardTitle>Recent permit changes</CardTitle>
          <div className="mt-4 space-y-3">
            {permit.recentChanges.length ? (
              permit.recentChanges.map((change) => (
                <div key={change.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{change.entityType}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{formatShortDate(change.changedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {Array.isArray(change.changedFieldsJson)
                      ? `Changed: ${change.changedFieldsJson.join(", ")}`
                      : "Change captured in log."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No permit-specific change log entries yet.</p>
            )}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
