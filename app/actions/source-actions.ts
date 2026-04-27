"use server";

import { revalidatePath } from "next/cache";

import { ingestSourceByKey } from "@/lib/domain/ingestion/service";

export async function runSourceAdapterAction(formData: FormData) {
  const sourceKey = formData.get("sourceKey");

  if (typeof sourceKey !== "string" || !sourceKey) {
    throw new Error("Invalid source adapter run request.");
  }

  await ingestSourceByKey(sourceKey, { triggerMode: "manual" });

  revalidatePath("/");
  revalidatePath("/sources");
}
