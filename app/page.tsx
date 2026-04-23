import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { FilterBar } from "@/components/leads/filter-bar";
import { LeadQueue } from "@/components/leads/lead-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/domain/queries/dashboard";
import { getLeadQueue } from "@/lib/domain/queries/leads";
import type { LeadQueueFilters } from "@/lib/domain/types";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseFilters(params: Record<string, string | string[] | undefined>): LeadQueueFilters {
  const getValue = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    city: getValue("city"),
    jurisdiction: getValue("jurisdiction"),
    permitType: getValue("permitType"),
    leadType: (getValue("leadType") as LeadQueueFilters["leadType"]) ?? "",
    minScore: getValue("minScore") ? Number(getValue("minScore")) : undefined,
    maxScore: getValue("maxScore") ? Number(getValue("maxScore")) : undefined,
    issueDateFrom: getValue("issueDateFrom"),
    issueDateTo: getValue("issueDateTo"),
    sourceId: getValue("sourceId"),
    status: (getValue("status") as LeadQueueFilters["status"]) ?? "",
    organization: getValue("organization"),
    query: getValue("query"),
    sort: (getValue("sort") as LeadQueueFilters["sort"]) ?? "newest"
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const dashboard = await getDashboardData();
  const filters = parseFilters(params);
  const leads = await getLeadQueue(filters);

  return (
    <AppShell pathname="/">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="relative overflow-hidden">
          <Badge className="bg-primary text-primary-foreground">Operational MVP</Badge>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight">
            Public permits in, scored insulation opportunities out, with reviewable provenance at every step.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            This workflow separates raw source records from reviewed leads, favors resilient adapters over brittle scraping,
            and gives the owner a queue they can actually work from.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sources">Check source health</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/imports">Review import workflow</Link>
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Manual review matters</CardTitle>
          <CardDescription className="mt-3">
            Sources that are login-gated, unstable, or anti-bot sensitive are marked manual/public-review instead of scraped
            aggressively. CSV/XLSX import and saved-source workflows stay first-class.
          </CardDescription>
          <div className="mt-6 grid gap-3">
            {dashboard.sources.slice(0, 4).map((source) => (
              <div key={source.id} className="rounded-2xl bg-secondary/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">{source.name}</p>
                  <Badge>{source.healthStatus}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{source.jurisdiction}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New Today" value={dashboard.metrics.newToday} hint="Leads first seen or refreshed in the last 24 hours." />
        <StatCard label="This Week" value={dashboard.metrics.newWeek} hint="Fresh market volume to work this week." />
        <StatCard label="High Priority" value={dashboard.metrics.highPriority} hint="Overall score 75+ with strong insulation fit." />
        <StatCard
          label="Active Sources"
          value={dashboard.sources.filter((source) => source.enabled).length}
          hint="Adapters currently enabled for automated polling."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <CardTitle>Lead Queue</CardTitle>
              <CardDescription className="mt-2">
                Review high-probability insulation opportunities first, then work the long tail.
              </CardDescription>
            </div>
            <Badge>{leads.length} visible</Badge>
          </div>
          <div className="mt-5">
            <FilterBar filters={filters} />
          </div>
          <div className="mt-5">
            <LeadQueue leads={leads} />
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardTitle>Top builders / GCs</CardTitle>
            <div className="mt-4 space-y-3">
              {dashboard.topBuilders.map((builder) => (
                <div key={builder.id} className="rounded-2xl bg-secondary/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{builder.name}</p>
                      <p className="text-sm text-muted-foreground">{builder.type}</p>
                    </div>
                    <Badge>{builder._count.leadLinks} leads</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Neighborhood hot spots</CardTitle>
            <div className="mt-4 space-y-3">
              {dashboard.subdivisionHotSpots.map((spot, index) => (
                <div key={`${spot.subdivision}-${spot.neighborhood}-${index}`} className="rounded-2xl bg-secondary/70 p-4">
                  <p className="font-semibold">{spot.subdivision ?? spot.neighborhood ?? "Unknown area"}</p>
                  <p className="text-sm text-muted-foreground">{spot._count.id ?? 0} related properties</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
