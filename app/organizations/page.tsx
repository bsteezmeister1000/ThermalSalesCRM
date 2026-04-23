import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getOrganizations } from "@/lib/domain/queries/organizations";

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <AppShell pathname="/organizations">
      <Card>
        <CardTitle>Organizations</CardTitle>
        <CardDescription className="mt-2">
          Recurring builders, GCs, owners, and contractors with compounding market activity.
        </CardDescription>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {organizations.map((organization) => (
          <Card key={organization.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{organization.name}</CardTitle>
                <CardDescription className="mt-2">{organization.type}</CardDescription>
              </div>
              <Badge>{organization._count.leadLinks} linked leads</Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Confidence {organization.confidence} · {organization.email ?? "No public email"} ·{" "}
              {organization.phone ?? "No public phone"}
            </p>
            <div className="mt-5">
              <Link
                href={`/organizations/${organization.id}`}
                prefetch={false}
                className="text-sm font-semibold text-primary"
              >
                Open activity →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
