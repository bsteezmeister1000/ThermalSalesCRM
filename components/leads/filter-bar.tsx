import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LeadQueueFilters } from "@/lib/domain/types";
import { leadSavedViews } from "@/lib/presentation/lead-filters";
import { cn } from "@/lib/utils/cn";

export function FilterBar({ filters }: { filters: LeadQueueFilters }) {
  return (
    <div className="sticky top-4 z-20 space-y-3">
      <Card className="border-slate-200 bg-white/95 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Saved views</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {leadSavedViews.map((view) => {
                const active = (filters.view ?? "all") === view.value;
                return (
                  <Link
                    key={view.value}
                    href={view.href}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm font-medium transition",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {view.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Work the queue from left to right: triage, qualify, contact, estimate, bid.
          </div>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white/95 p-4">
        <form className="space-y-4">
          <input type="hidden" name="view" value={filters.view ?? "all"} />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
            <input
              name="query"
              placeholder="Search address, permit #, project, or description"
              defaultValue={filters.query}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
            <input
              name="organization"
              placeholder="Builder / organization"
              defaultValue={filters.organization}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
            <input
              name="city"
              placeholder="City"
              defaultValue={filters.city}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
            <select
              name="status"
              defaultValue={filters.status}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            >
              <option value="">Any stage</option>
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
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            >
              <option value="newest">Newest</option>
              <option value="highest_score">Highest score</option>
              <option value="valuation">Valuation</option>
              <option value="builder_momentum">Builder momentum</option>
              <option value="recently_changed">Recently changed</option>
            </select>
          </div>

          <details className="group rounded-2xl border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700">
              More filters
            </summary>
            <div className="grid gap-3 border-t border-slate-200 px-4 py-4 md:grid-cols-2 xl:grid-cols-5">
              <input
                name="permitType"
                placeholder="Permit type"
                defaultValue={filters.permitType}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
              <input
                name="jurisdiction"
                placeholder="Jurisdiction"
                defaultValue={filters.jurisdiction}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
              <select
                name="leadType"
                defaultValue={filters.leadType}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">Any lead type</option>
                <option value="new_home">New home</option>
                <option value="multifamily">Multifamily</option>
                <option value="commercial">Commercial</option>
                <option value="remodel">Remodel</option>
                <option value="addition">Addition</option>
                <option value="retrofit_adjacent">Retrofit adjacent</option>
                <option value="unknown">Unknown</option>
              </select>
              <input
                name="minScore"
                type="number"
                min={0}
                max={100}
                placeholder="Min score"
                defaultValue={filters.minScore}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
              <input
                name="issueDateFrom"
                type="date"
                defaultValue={filters.issueDateFrom}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="bg-slate-900 text-white hover:opacity-95">
              Update queue
            </Button>
            <Button type="button" variant="outline" asChild className="border-slate-200">
              <Link href="/leads">Reset filters</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
