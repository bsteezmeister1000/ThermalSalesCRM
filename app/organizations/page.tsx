import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getOrganizations } from "@/lib/domain/queries/organizations";
import { formatLeadStatus, getLeadStatusTone } from "@/lib/presentation/leads";

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <AppShell pathname="/organizations">
      <Card className="border-slate-200 bg-white">
        <CardTitle>Organizations</CardTitle>
        <CardDescription className="mt-2">
          Use this view to spot recurring builders, contractors, and owners with growing opportunity footprint.
        </CardDescription>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {organizations.map((organization) => {
          const activeLeads = organization.leadLinks.filter((link) =>
            ["new", "review", "qualified", "contacted", "estimating", "bid_sent"].includes(link.lead.status)
          ).length;
          const cities = Array.from(new Set(organization.leadLinks.map((link) => link.lead.permit.city).filter(Boolean)));
          const bestScore = Math.max(0, ...organization.leadLinks.map((link) => link.lead.overallScore));

          return (
            <Card key={organization.id} className="border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{organization.name}</CardTitle>
                  <CardDescription className="mt-2">{organization.type}</CardDescription>
                </div>
                <Badge>{organization._count.leadLinks} linked leads</Badge>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active pipeline</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{activeLeads}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Best score</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{bestScore}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">City spread</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{cities.slice(0, 3).join(", ") || "Unknown"}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {organization.leadLinks.slice(0, 3).map((link) => (
                  <div key={`${link.leadId}-${link.relationshipType}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-950">{link.lead.permit.city ?? "Unknown city"}</p>
                      <p className="text-sm text-slate-500">Opportunity score {link.lead.overallScore}</p>
                    </div>
                    <Badge className={getLeadStatusTone(link.lead.status)}>{formatLeadStatus(link.lead.status)}</Badge>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {organization.email ?? "No public email"} · {organization.phone ?? "No public phone"}
              </p>

              <div className="mt-5">
                <Link href={`/organizations/${organization.id}`} prefetch={false} className="text-sm font-semibold text-slate-900">
                  Open organization →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
