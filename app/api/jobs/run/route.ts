import { NextResponse } from "next/server";

import { ingestSourceByKey } from "@/lib/domain/ingestion/service";

export async function POST(request: Request) {
  const body = (await request.json()) as { sourceKey?: string };
  if (!body.sourceKey) {
    return NextResponse.json({ error: "sourceKey is required" }, { status: 400 });
  }

  const result = await ingestSourceByKey(body.sourceKey);
  return NextResponse.json({ result });
}
