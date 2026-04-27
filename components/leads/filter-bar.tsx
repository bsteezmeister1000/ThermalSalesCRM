import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LeadQueueFilters } from "@/lib/domain/types";
import type { getLeadFilters } from "@/lib/domain/queries/leads";

type LeadFilterOptions = Awaited<ReturnType<typeof getLeadFilters>>;

export function FilterBar({
  filters,
  options
}: {
  filters: LeadQueueFilters;
  options: LeadFilterOptions;
}) {
  return (
    <Card>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <input
          name="query"
          placeholder="Search permit #, city, jurisdiction, address, or project"
          defaultValue={filters.query}
          className="rounded-2xl border bg-white px-4 py-3"
        />
        <select
          name="city"
          defaultValue={filters.city}
          className="rounded-2xl border bg-white px-4 py-3"
        >
          <option value="">Any city</option>
          {options.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          name="jurisdiction"
          defaultValue={filters.jurisdiction}
          className="rounded-2xl border bg-white px-4 py-3"
        >
          <option value="">Any jurisdiction</option>
          {options.jurisdictions.map((jurisdiction) => (
            <option key={jurisdiction} value={jurisdiction}>
              {jurisdiction}
            </option>
          ))}
        </select>
        <input
          name="organization"
          placeholder="Builder / organization"
          defaultValue={filters.organization}
          className="rounded-2xl border bg-white px-4 py-3"
        />
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded-2xl border bg-white px-4 py-3"
        >
          <option value="">Any active status</option>
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
        <select
          name="sort"
          defaultValue={filters.sort ?? "newest"}
          className="rounded-2xl border bg-white px-4 py-3"
        >
          <option value="newest">Most recent permit</option>
          <option value="highest_score">Highest score</option>
          <option value="valuation">Valuation</option>
          <option value="builder_momentum">Builder momentum</option>
          <option value="recently_changed">Recently changed</option>
        </select>
        <div className="flex items-center gap-3 md:col-span-2 xl:col-span-6">
          <Button type="submit">Apply filters</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">Reset</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}
