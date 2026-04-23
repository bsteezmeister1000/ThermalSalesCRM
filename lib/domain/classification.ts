import type { LeadType } from "@prisma/client";

export function classifyLeadType(input: {
  permitType?: string | null;
  workClass?: string | null;
  description?: string | null;
}) {
  const haystack = [
    input.permitType,
    input.workClass,
    input.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("single family") || haystack.includes("new house")) {
    return "new_home" satisfies LeadType;
  }
  if (haystack.includes("multi") || haystack.includes("apartment")) {
    return "multifamily" satisfies LeadType;
  }
  if (haystack.includes("shell") || haystack.includes("commercial")) {
    return "commercial" satisfies LeadType;
  }
  if (haystack.includes("addition")) {
    return "addition" satisfies LeadType;
  }
  if (
    haystack.includes("roof") ||
    haystack.includes("siding") ||
    haystack.includes("window") ||
    haystack.includes("envelope")
  ) {
    return "retrofit_adjacent" satisfies LeadType;
  }
  if (
    haystack.includes("remodel") ||
    haystack.includes("alteration") ||
    haystack.includes("tenant improvement")
  ) {
    return "remodel" satisfies LeadType;
  }
  return "unknown" satisfies LeadType;
}
