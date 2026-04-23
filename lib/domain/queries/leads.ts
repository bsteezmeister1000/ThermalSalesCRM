import { findLeadById, listLeadQueue } from "@/lib/repositories/lead-repository";
import type { LeadQueueFilters } from "@/lib/domain/types";

export async function getLeadQueue(filters: LeadQueueFilters) {
  return listLeadQueue({
    view: filters.view,
    city: filters.city,
    jurisdiction: filters.jurisdiction,
    permitType: filters.permitType,
    leadType: filters.leadType,
    status: filters.status,
    organization: filters.organization,
    query: filters.query,
    minScore: filters.minScore,
    maxScore: filters.maxScore,
    issueDateFrom: filters.issueDateFrom,
    issueDateTo: filters.issueDateTo,
    sourceId: filters.sourceId,
    sort: filters.sort
  });
}

export async function getLeadDetail(id: string) {
  return findLeadById(id);
}
