import { getAdapters } from "@/lib/domain/adapters/registry";
import { ingestSourceByKey } from "@/lib/domain/ingestion/service";
import { upsertSource } from "@/lib/repositories/source-repository";

function slugifyJurisdiction(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const adapterKey = "coralville-building-permit-reports";
  const adapter = getAdapters().find((item) => item.definition.key === adapterKey);

  if (!adapter) {
    throw new Error(`Adapter not found: ${adapterKey}`);
  }

  const health = await adapter.healthcheck();

  await upsertSource({
    adapterKey: adapter.definition.key,
    name: adapter.definition.name,
    jurisdiction: adapter.definition.jurisdiction,
    jurisdictionSlug: slugifyJurisdiction(adapter.definition.jurisdiction),
    type: adapter.definition.type,
    baseUrl: adapter.definition.key,
    supportsAutomation: health.supportsAutomation,
    manualReviewOnly: !health.supportsAutomation,
    crawlFrequencyMinutes: health.supportsAutomation
      ? adapter.definition.crawlFrequencyMinutes ?? 1440
      : null,
    healthStatus: health.status,
    notes: adapter.definition.description,
    healthDetailsJson: {
      message: health.message,
      automationMode: adapter.definition.automationMode
    }
  });

  const result = await ingestSourceByKey(adapterKey);

  console.log(
    [
      `Coralville monthly ingest complete.`,
      `sourceId=${result.sourceId}`,
      `reports=${result.discovered}`,
      `rawRecords=${result.rawRecordsWritten}`,
      `permits=${result.permitsUpserted}`,
      `leads=${result.leadsUpserted}`,
      `errors=${result.errors.length}`
    ].join(" ")
  );

  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
