import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getOrganizationDetail } from "@/lib/domain/queries/organizations";

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

  return (
    <AppShell pathname="/organizations">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{organization.name}</CardTitle>
            <CardDescription className="mt-2">
              {organization.type} · normalized as {organization.normalizedName}
            </CardDescription>
          </div>
          <Badge>{organization.leadLinks.length} linked leads</Badge>
        </div>
      </Card>
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardTitle>Contacts</CardTitle>
          <div className="mt-4 space-y-3">
            {organization.contacts.length ? (
              organization.contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl bg-secondary/70 p-4">
                  <p className="font-semibold">{contact.fullName}</p>
                  <p className="text-sm text-muted-foreground">{contact.roleTitle ?? "Public contact"}</p>
                  <p className="text-sm text-muted-foreground">{contact.email ?? contact.phone ?? "Manual verification needed"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No public business contacts attached yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Related permits and leads</CardTitle>
          <div className="mt-4 space-y-3">
            {organization.leadLinks.map((link) => (
              <div key={`${link.leadId}-${link.relationshipType}`} className="rounded-2xl bg-secondary/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{link.lead.permit.address1 ?? "Unknown address"}</p>
                    <p className="text-sm text-muted-foreground">
                      {link.lead.permit.permitNumber} · {link.lead.permit.permitType}
                    </p>
                  </div>
                  <Badge>{link.relationshipType}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
