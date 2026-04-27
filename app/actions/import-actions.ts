"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ingestManualCsvImport } from "@/lib/domain/ingestion/service";

export async function importManualCsvAction(formData: FormData) {
  const sourceId = formData.get("sourceId");
  const csv = formData.get("csv");

  if (typeof sourceId !== "string" || !sourceId) {
    redirect("/imports?error=missing-source");
  }

  if (typeof csv !== "string" || !csv.trim()) {
    redirect("/imports?error=missing-csv");
  }

  try {
    const result = await ingestManualCsvImport({
      sourceId,
      csv,
      actor: "web"
    });

    revalidatePath("/");
    revalidatePath("/imports");
    revalidatePath("/sources");

    redirect(
      `/imports?imported=${result.permitsUpserted}&rows=${result.discovered}&errors=${result.errors.length}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    redirect(`/imports?error=${encodeURIComponent(message)}`);
  }
}
