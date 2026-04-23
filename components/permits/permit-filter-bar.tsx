import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PermitListFilters } from "@/lib/domain/types";

export function PermitFilterBar({ filters }: { filters: PermitListFilters }) {
  return (
    <Card className="sticky top-4 z-20 border-slate-200 bg-white/95 p-4">
      <form className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <input
            name="query"
            placeholder="Search permit #, address, city, or project"
            defaultValue={filters.query}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
          <input
            name="city"
            placeholder="City"
            defaultValue={filters.city}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
          <input
            name="permitType"
            placeholder="Permit type"
            defaultValue={filters.permitType}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
          <input
            name="status"
            placeholder="Permit status"
            defaultValue={filters.status}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
          <select
            name="sort"
            defaultValue={filters.sort ?? "newest"}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          >
            <option value="newest">Newest issue date</option>
            <option value="oldest">Oldest issue date</option>
            <option value="highest_value">Highest valuation</option>
            <option value="priority">Highest lead score</option>
            <option value="recently_seen">Recently updated</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_220px_auto]">
          <select
            name="leadStatus"
            defaultValue={filters.leadStatus}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          >
            <option value="">Any lead status</option>
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
            name="radiusMode"
            defaultValue={filters.radiusMode ?? "verified_or_approx"}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          >
            <option value="verified_or_approx">Exact + city-estimated matches</option>
            <option value="verified_only">Exact-coordinate matches only</option>
          </select>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="bg-slate-900 text-white hover:opacity-95">
              Update permit list
            </Button>
            <Button type="button" variant="outline" asChild className="border-slate-200">
              <Link href="/permits">Reset filters</Link>
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
