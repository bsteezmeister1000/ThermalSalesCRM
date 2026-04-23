import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getOrganizationDetail } from "@/lib/domain/queries/organizations";
import { formatLeadStatus, getLeadStatusTone } from "@/lib/presentation/leads";

export default async function OrganizationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getOrganizationDetail(id);
  if (!organization) {
    notFound();
  }

  const cities = Array.from(
    new Set(organization.leadLinks.map((link) => link.lead.permit.city).filter(Boolean))
  );

  return (
    <AppShell pathname="/organizations">
      <Card className="border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{organization.name}</CardTitle>
            <CardDescription className="mt-2">
              {organization.type} · normalized as {organization.normalizedName}
            </CardDescription>
          </div>
          <Badge>{organization.leadLinks.length} linked leads</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Cities</p>
            <p className="mt-2 font-semibold text-slate-950">{cities.join(", ") || "Unknown"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
            <p className="mt-2 font-semibold text-slate-950">{organization.email ?? "Not captured"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Phone</p>
            <p className="mt-2 font-semibold text-slate-950">{organization.phone ?? "Not captured"}</p>
          </div>
        </div>
      </Card>
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-slate-200 bg-white">
          <CardTitle>Contacts</CardTitle>
          <div className="mt-4 space-y-3">
            {organization.contacts.length ? (
              organization.contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{contact.fullName}</p>
                  <p className="text-sm text-slate-500">{contact.roleTitle ?? "Public contact"}</p>
                  <p className="text-sm text-slate-500">{contact.email ?? contact.phone ?? "Manual verification needed"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No public business contacts attached yet.</p>
            )}
          </div>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardTitle>Related permits and leads</CardTitle>
          <div className="mt-4 space-y-3">
            {organization.leadLinks.map((link) => (
              <Link
                key={`${link.leadId}-${link.relationshipType}`}
                href={`/leads/${link.leadId}`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{link.lead.permit.address1 ?? "Unknown address"}</p>
                    <p className="text-sm text-slate-500">
                      {link.lead.permit.permitNumber} · {link.lead.permit.permitType}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{link.relationshipType}</Badge>
                    <Badge className={getLeadStatusTone(link.lead.status)}>{formatLeadStatus(link.lead.status)}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
