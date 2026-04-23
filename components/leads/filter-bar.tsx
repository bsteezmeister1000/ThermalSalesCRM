import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LeadQueueFilters } from "@/lib/domain/types";

export function FilterBar({ filters }: { filters: LeadQueueFilters }) {
  return (
    <Card>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          name="query"
          placeholder="Search permit #, address, or project"
          defaultValue={filters.query}
          className="rounded-2xl border bg-white px-4 py-3"
        />
        <input
          name="city"
          placeholder="City"
          defaultValue={filters.city}
          className="rounded-2xl border bg-white px-4 py-3"
        />
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
          <option value="">Any status</option>
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
          <option value="newest">Newest</option>
          <option value="highest_score">Highest score</option>
          <option value="valuation">Valuation</option>
          <option value="builder_momentum">Builder momentum</option>
          <option value="recently_changed">Recently changed</option>
        </select>
        <div className="md:col-span-2 xl:col-span-5 flex items-center gap-3">
          <Button type="submit">Apply filters</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">Reset</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}
