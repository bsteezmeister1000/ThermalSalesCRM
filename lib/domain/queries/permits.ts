import { findPermitById, listPermitsWithinRadius } from "@/lib/repositories/permit-repository";
import type { PermitListFilters } from "@/lib/domain/types";

export async function getPermitList(filters: PermitListFilters) {
  return listPermitsWithinRadius(filters);
}

export async function getPermitDetail(id: string) {
  return findPermitById(id);
}
