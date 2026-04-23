"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus, NextActionState } from "@prisma/client";

import { bulkUpdateLeadStatus, createLeadNote, updateLeadNextAction, updateLeadStatus } from "@/lib/repositories/lead-repository";

function parseLeadStatus(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const allowed = new Set(Object.values(LeadStatus));
  return allowed.has(value as LeadStatus) ? (value as LeadStatus) : null;
}

function parseNextActionState(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const allowed = new Set(Object.values(NextActionState));
  return allowed.has(value as NextActionState) ? (value as NextActionState) : null;
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
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadNextActionAction(formData: FormData) {
  const leadId = formData.get("leadId");
  const nextActionState = parseNextActionState(formData.get("nextActionState"));
  const nextAction = formData.get("nextAction");
  const nextActionDueAt = formData.get("nextActionDueAt");

  if (typeof leadId !== "string" || !nextActionState) {
    throw new Error("Invalid next action update.");
  }

  await updateLeadNextAction({
    id: leadId,
    nextAction: typeof nextAction === "string" ? nextAction.trim() : undefined,
    nextActionState,
    nextActionDueAt:
      typeof nextActionDueAt === "string" && nextActionDueAt
        ? new Date(`${nextActionDueAt}T12:00:00`)
        : null,
    actor: "web"
  });

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function addLeadNoteAction(formData: FormData) {
  const leadId = formData.get("leadId");
  const note = formData.get("note");

  if (typeof leadId !== "string" || typeof note !== "string" || !note.trim()) {
    throw new Error("Invalid note.");
  }

  await createLeadNote({
    id: leadId,
    note: note.trim(),
    actor: "web"
  });

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function bulkUpdateLeadWorkflowAction(formData: FormData) {
  const status = parseLeadStatus(formData.get("status"));
  const ids = formData
    .getAll("leadIds")
    .filter((value): value is string => typeof value === "string");

  if (!status || !ids.length) {
    throw new Error("Select at least one lead and a valid status.");
  }

  await bulkUpdateLeadStatus({
    ids,
    status,
    actor: "web"
  });

  revalidatePath("/");
  revalidatePath("/leads");
}
