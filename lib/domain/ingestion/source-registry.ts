import { getAdapters } from "@/lib/domain/adapters/registry";
import { upsertSource } from "@/lib/repositories/source-repository";

function slugifyJurisdiction(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function syncSourceRegistry() {
  for (const adapter of getAdapters()) {
    const health = await adapter.reportHealth();

    await upsertSource({
      preserveRuntimeStatus: true,
      adapterKey: adapter.definition.key,
      name: adapter.definition.name,
      jurisdiction: adapter.definition.jurisdiction,
      jurisdictionSlug: slugifyJurisdiction(adapter.definition.jurisdiction),
      type: adapter.definition.type,
      accessMethod: adapter.definition.accessMethod,
      baseUrl: adapter.definition.baseUrl,
      activeStatus: adapter.definition.activeStatus ?? (health.supportsAutomation ? "active" : "manual_only"),
      supportsAutomation: health.supportsAutomation,
      manualReviewOnly: !health.supportsAutomation,
      crawlFrequencyMinutes: health.supportsAutomation ? 1440 : null,
      expectedUpdateFrequencyHours: adapter.definition.expectedUpdateFrequencyHours ?? null,
      expectedFields: adapter.definition.expectedFields ?? null,
      parserName: adapter.definition.parserName ?? null,
      parserVersion: adapter.definition.parserVersion ?? null,
      healthStatus: health.status,
      freshnessStatus: health.freshnessStatus ?? "unknown",
      sourceConfidence: health.sourceConfidence ?? 50,
      notes: adapter.definition.description,
      healthDetailsJson: {
        message: health.message,
        automationMode: adapter.definition.automationMode
      }
    });
  }
}
