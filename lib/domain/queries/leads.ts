import { findLeadById, listLeadFilterOptions, listLeadQueue } from "@/lib/repositories/lead-repository";
import type { LeadQueueFilters } from "@/lib/domain/types";

export async function getLeadQueue(filters: LeadQueueFilters) {
  return listLeadQueue({
    city: filters.city,
    jurisdiction: filters.jurisdiction,
    permitType: filters.permitType,
    leadType: filters.leadType,
    status: filters.status,
    organization: filters.organization,
    query: filters.query,
    minScore: filters.minScore,
    maxScore: filters.maxScore,
    sort: filters.sort
  });
}

export async function getLeadDetail(id: string) {
  return findLeadById(id);
}

export async function getLeadFilters() {
  return listLeadFilterOptions();
}
