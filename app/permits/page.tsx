import { AppShell } from "@/components/layout/app-shell";
import { PermitFilterBar } from "@/components/permits/permit-filter-bar";
import { PermitTable } from "@/components/permits/permit-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getPermitList } from "@/lib/domain/queries/permits";
import { parsePermitFilters } from "@/lib/presentation/permit-filters";

type PermitPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PermitsPage({ searchParams }: PermitPageProps) {
  const params = await searchParams;
  const filters = parsePermitFilters(params);
  const permitList = await getPermitList(filters);

  return (
    <AppShell pathname="/permits">
      <Card className="border-slate-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <CardTitle>Permits in the Cedar Rapids radius</CardTitle>
            <CardDescription className="mt-2">
              Showing scraped permits within {permitList.center.radiusMiles} miles of {permitList.center.label}. Exact coordinates are
              used when stored; otherwise the app falls back to city-centroid estimates and labels them clearly.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-slate-900 text-white">{permitList.totals.totalInRadius} permits in radius</Badge>
            <Badge>{permitList.totals.exactMatches} exact</Badge>
            <Badge>{permitList.totals.approximateMatches} city-estimated</Badge>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <PermitFilterBar filters={filters} />

        <Card className="border-slate-200 bg-white">
          <CardTitle>Coverage notes</CardTitle>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              Exact radius inclusion is based on stored property latitude/longitude. If coordinates are missing, the app uses a
              supported city centroid and marks the match as approximate.
            </p>
            <p>
              The table only shows records currently stored in the database. Fixture, seeded, and manual-import data remain
              visible through their attached source and provenance rather than being presented as live municipal data.
            </p>
            <p>{permitList.totals.excludedUnknown} permit records are excluded because the app cannot verify their location yet.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top cities</p>
                <div className="mt-3 space-y-2">
                  {permitList.cityBreakdown.slice(0, 4).map((item) => (
                    <div key={item.city} className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{item.city}</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top permit types</p>
                <div className="mt-3 space-y-2">
                  {permitList.permitTypeBreakdown.slice(0, 4).map((item) => (
                    <div key={item.permitType} className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{item.permitType}</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <PermitTable permits={permitList.permits} />
    </AppShell>
  );
}
