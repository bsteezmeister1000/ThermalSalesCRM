import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/domain/queries/dashboard";
import {
  describeDueDate,
  formatLeadStatus,
  formatLeadType,
  formatShortDate,
  getLeadStatusTone,
  getPriorityTone
} from "@/lib/presentation/leads";

export default async function Home() {
  const dashboard = await getDashboardData();

  return (
    <AppShell pathname="/">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-slate-200 bg-white">
          <Badge className="bg-slate-900 text-white">Sales operations</Badge>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
            Start from real permit activity, qualify the best insulation opportunities, and move the pipeline without extra clicks.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            The product now stays tightly focused on permit-driven lead tracking: fresh permits, leads needing action,
            builder momentum, and source health that could change what the sales team works next.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-slate-900 text-white hover:opacity-95">
              <Link href="/permits">Open permit list</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-200">
              <Link href="/leads?view=review_now">Open review queue</Link>
            </Button>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardTitle>Today&apos;s operational snapshot</CardTitle>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Needs action</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.metrics.needsAction}</p>
              <p className="mt-2 text-sm text-slate-500">Open triage, follow-up, or bid progression items.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent source updates</p>
              <div className="mt-3 space-y-2">
                {dashboard.sources.slice(0, 3).map((source) => (
                  <div key={source.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{source.name}</p>
                      <p className="text-slate-500">{source.jurisdiction}</p>
                    </div>
                    <Badge>{source.healthStatus}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New Today" value={dashboard.metrics.newToday} hint="Fresh leads that appeared in the last 24 hours." />
        <StatCard label="This Week" value={dashboard.metrics.newWeek} hint="New market activity seen this week." />
        <StatCard label="High Priority" value={dashboard.metrics.highPriority} hint="Score 75+ and worth immediate attention." />
        <StatCard label="Needs Action" value={dashboard.metrics.needsAction} hint="Leads with open work for the sales team." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white">
          <div className="flex items-end justify-between gap-4">
            <div>
              <CardTitle>Work next</CardTitle>
              <CardDescription className="mt-2">
                A short list of high-signal leads so the team can start moving immediately.
              </CardDescription>
            </div>
            <Button asChild variant="outline" className="border-slate-200">
              <Link href="/leads">Open full queue</Link>
            </Button>
          </div>
          <div className="mt-5 space-y-3">
            {dashboard.recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="block rounded-3xl border border-slate-200 p-4 transition hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{lead.permit.address1 ?? "Unknown address"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {lead.primaryOrg?.name ?? "Builder missing"} · {lead.permit.city}, {lead.permit.state}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getLeadStatusTone(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
                    <Badge className={getPriorityTone(lead.overallScore)}>{lead.overallScore}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  <p>{formatLeadType(lead.leadType)}</p>
                  <p>{lead.nextAction ?? lead.recommendedAction ?? "Set next action"}</p>
                  <p>{describeDueDate(lead.nextActionDueAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="border-slate-200 bg-white">
            <CardTitle>Top builders / organizations</CardTitle>
            <div className="mt-4 space-y-3">
              {dashboard.topBuilders.map((builder) => (
                <div key={builder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{builder.name}</p>
                      <p className="text-sm text-slate-500">{builder.type}</p>
                    </div>
                    <Badge>{builder._count.leadLinks} leads</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardTitle>Recent workflow activity</CardTitle>
            <div className="mt-4 space-y-3">
              {dashboard.recentActivity.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{activity.lead.permit.address1 ?? "Unknown address"}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {formatShortDate(activity.activityAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{activity.detail ?? activity.activityType}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
