"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus } from "@prisma/client";

import { updateLeadStatus } from "@/lib/repositories/lead-repository";

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
