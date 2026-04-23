import type { ActivityType, LeadStatus, NextActionState, ReviewFlagType } from "@prisma/client";
import { differenceInCalendarDays, format, formatDistanceToNowStrict, isBefore, subDays } from "date-fns";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  review: "Review",
  qualified: "Qualified",
  contacted: "Contacted",
  estimating: "Estimating",
  bid_sent: "Bid sent",
  won: "Won",
  lost: "Lost",
  archived: "Archived"
};

const ACTIVITY_LABELS: Partial<Record<ActivityType, string>> = {
  scraped: "New lead created",
  updated: "Lead updated",
  reviewed: "Reviewed by team",
  contacted: "Outreach recorded",
  note: "New note added",
  estimate_created: "Estimate created",
  bid_sent: "Bid sent",
  won: "Marked won",
  lost: "Marked lost"
};

export function formatLeadStatus(status: LeadStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function getLeadStatusTone(status: LeadStatus) {
  switch (status) {
    case "new":
      return "bg-slate-900 text-white";
    case "review":
      return "bg-amber-100 text-amber-800";
    case "qualified":
      return "bg-sky-100 text-sky-800";
    case "contacted":
      return "bg-indigo-100 text-indigo-800";
    case "estimating":
      return "bg-violet-100 text-violet-800";
    case "bid_sent":
      return "bg-orange-100 text-orange-800";
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-rose-100 text-rose-800";
    case "archived":
      return "bg-zinc-200 text-zinc-700";
  }
}

export function getPriorityLabel(score: number) {
  if (score >= 85) return "Priority A";
  if (score >= 70) return "Priority B";
  if (score >= 55) return "Priority C";
  return "Watch";
}

export function getPriorityTone(score: number) {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 70) return "bg-amber-100 text-amber-800";
  if (score >= 55) return "bg-slate-200 text-slate-800";
  return "bg-zinc-100 text-zinc-700";
}

export function formatLeadType(value: string) {
  return value.replaceAll("_", " ");
}

export function formatActionState(state: NextActionState) {
  switch (state) {
    case "open":
      return "Open";
    case "waiting":
      return "Waiting";
    case "done":
      return "Done";
  }
}

export function getActionStateTone(state: NextActionState) {
  switch (state) {
    case "open":
      return "bg-slate-900 text-white";
    case "waiting":
      return "bg-amber-100 text-amber-800";
    case "done":
      return "bg-emerald-100 text-emerald-800";
  }
}

export function describeDueDate(value?: Date | null) {
  if (!value) {
    return "No due date";
  }

  const today = new Date();
  if (differenceInCalendarDays(value, today) === 0) {
    return "Due today";
  }

  if (isBefore(value, today)) {
    return `Overdue by ${formatDistanceToNowStrict(value)}`;
  }

  return `Due in ${formatDistanceToNowStrict(value)}`;
}

export function formatShortDate(value?: Date | null) {
  return value ? format(value, "MMM d") : "Unknown";
}

export function describeRecentChange(input: {
  firstSeenAt: Date;
  updatedAt: Date;
  permitLastSeenAt?: Date | null;
  latestActivityType?: ActivityType | null;
  unresolvedFlags?: ReviewFlagType[];
}) {
  if (input.unresolvedFlags?.includes("stale")) {
    return "Stale lead needs review";
  }

  if (isBefore(subDays(new Date(), 2), input.firstSeenAt)) {
    return "New lead this week";
  }

  if (input.latestActivityType && ACTIVITY_LABELS[input.latestActivityType]) {
    return ACTIVITY_LABELS[input.latestActivityType] as string;
  }

  if (input.permitLastSeenAt && input.permitLastSeenAt > input.updatedAt) {
    return "Permit refreshed";
  }

  return "Scoring or review data changed";
}

export function getStageProgression(status: LeadStatus) {
  const stages: LeadStatus[] = ["new", "review", "qualified", "contacted", "estimating", "bid_sent"];
  return stages;
}
