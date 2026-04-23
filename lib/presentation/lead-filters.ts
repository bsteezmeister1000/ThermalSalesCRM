import type { LeadQueueFilters } from "@/lib/domain/types";

export function parseLeadQueueFilters(params: Record<string, string | string[] | undefined>): LeadQueueFilters {
  const getValue = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    view: (getValue("view") as LeadQueueFilters["view"]) ?? "all",
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

export const leadSavedViews = [
  {
    label: "All leads",
    value: "all",
    href: "/leads"
  },
  {
    label: "Review now",
    value: "review_now",
    href: "/leads?view=review_now"
  },
  {
    label: "High priority",
    value: "high_priority",
    href: "/leads?view=high_priority"
  },
  {
    label: "Pipeline",
    value: "qualified_pipeline",
    href: "/leads?view=qualified_pipeline"
  },
  {
    label: "Follow up",
    value: "follow_up",
    href: "/leads?view=follow_up"
  },
  {
    label: "Fresh changes",
    value: "recent",
    href: "/leads?view=recent"
  }
] as const;
