"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus, OrganizationType, RelationshipType } from "@prisma/client";

import { updateLeadEnrichment, updateLeadStatus } from "@/lib/repositories/lead-repository";

function parseLeadStatus(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const allowed = new Set(Object.values(LeadStatus));
  return allowed.has(value as LeadStatus) ? (value as LeadStatus) : null;
}

export async function updateLeadWorkflowAction(formData: FormData) {
  const leadId = formData.get("leadId");
  const status = parseLeadStatus(formData.get("status"));
  const note = formData.get("note");

  if (typeof leadId !== "string" || !status) {
    throw new Error("Invalid lead workflow update.");
  }

  const detail =
    typeof note === "string" && note.trim()
      ? note.trim()
      : `Lead status changed to ${status}.`;

  await updateLeadStatus({
    id: leadId,
    status,
    note: detail,
    actor: "web"
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function archiveLeadAction(formData: FormData) {
  const leadId = formData.get("leadId");

  if (typeof leadId !== "string") {
    throw new Error("Invalid lead archive update.");
  }

  await updateLeadStatus({
    id: leadId,
    status: LeadStatus.archived,
    note: "Lead archived from the queue.",
    actor: "web"
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function parseOrganizationType(value: string | undefined) {
  const allowed = new Set(Object.values(OrganizationType));
  return value && allowed.has(value as OrganizationType) ? (value as OrganizationType) : undefined;
}

function parseRelationshipType(value: string | undefined) {
  const allowed = new Set(Object.values(RelationshipType));
  return value && allowed.has(value as RelationshipType) ? (value as RelationshipType) : undefined;
}

export async function updateLeadEnrichmentAction(formData: FormData) {
  const leadId = getString(formData, "leadId");

  if (!leadId) {
    throw new Error("Invalid lead enrichment update.");
  }

  await updateLeadEnrichment({
    id: leadId,
    assignedTo: getString(formData, "assignedTo"),
    reviewNotes: getString(formData, "reviewNotes"),
    recommendedAction: getString(formData, "recommendedAction"),
    permitType: getString(formData, "permitType"),
    workClass: getString(formData, "workClass"),
    projectDescription: getString(formData, "projectDescription"),
    valuation: getString(formData, "valuation"),
    address1: getString(formData, "address1"),
    city: getString(formData, "city"),
    state: getString(formData, "state"),
    zip: getString(formData, "zip"),
    parcelNumber: getString(formData, "parcelNumber"),
    subdivision: getString(formData, "subdivision"),
    neighborhood: getString(formData, "neighborhood"),
    propertyNotes: getString(formData, "propertyNotes"),
    organizationName: getString(formData, "organizationName"),
    organizationType: parseOrganizationType(getString(formData, "organizationType")),
    relationshipType: parseRelationshipType(getString(formData, "relationshipType")),
    contactName: getString(formData, "contactName"),
    contactTitle: getString(formData, "contactTitle"),
    contactEmail: getString(formData, "contactEmail"),
    contactPhone: getString(formData, "contactPhone"),
    activityNote: getString(formData, "activityNote"),
    actor: "web"
  });

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}
