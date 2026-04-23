import type { PermitListFilters } from "@/lib/domain/types";

export function parsePermitFilters(params: Record<string, string | string[] | undefined>): PermitListFilters {
  const getValue = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    query: getValue("query"),
    city: getValue("city"),
    permitType: getValue("permitType"),
    status: getValue("status"),
    sourceId: getValue("sourceId"),
    leadStatus: (getValue("leadStatus") as PermitListFilters["leadStatus"]) ?? "",
    radiusMode: (getValue("radiusMode") as PermitListFilters["radiusMode"]) ?? "verified_or_approx",
    sort: (getValue("sort") as PermitListFilters["sort"]) ?? "newest"
  };
}
