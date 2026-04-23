import { AppShell } from "@/components/layout/app-shell";
import { FilterBar } from "@/components/leads/filter-bar";
import { LeadQueue } from "@/components/leads/lead-queue";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getLeadQueue } from "@/lib/domain/queries/leads";
import { parseLeadQueueFilters } from "@/lib/presentation/lead-filters";

type LeadQueuePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadQueuePage({ searchParams }: LeadQueuePageProps) {
  const params = await searchParams;
  const filters = parseLeadQueueFilters(params);
  const leads = await getLeadQueue(filters);

  return (
    <AppShell pathname="/leads">
      <Card className="border-slate-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <CardTitle>Lead queue</CardTitle>
            <CardDescription className="mt-2">
              The working surface for triage, qualification, follow-up, and bid progression.
            </CardDescription>
          </div>
          <Badge className="bg-slate-900 text-white">{leads.length} visible</Badge>
        </div>
      </Card>

      <FilterBar filters={filters} />
      <LeadQueue leads={leads} />
    </AppShell>
  );
}
