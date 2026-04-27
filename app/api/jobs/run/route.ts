import { NextResponse } from "next/server";

import { ingestSourceByKey, runDueAutomatedSources } from "@/lib/domain/ingestion/service";
import { syncRegisteredSourceDefaults } from "@/lib/repositories/source-repository";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sourceKey?: string; mode?: "due" | "manual" };

  await syncRegisteredSourceDefaults();

  if (!body.sourceKey || body.mode === "due") {
    const results = await runDueAutomatedSources();
    return NextResponse.json({ results });
  }

  const result = await ingestSourceByKey(body.sourceKey, { triggerMode: "manual" });
  return NextResponse.json({ result });
}
