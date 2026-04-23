import { getAdapters } from "@/lib/domain/adapters/registry";
import { ingestSourceByKey } from "@/lib/domain/ingestion/service";

async function main() {
  for (const adapter of getAdapters()) {
    if (adapter.definition.automationMode === "automated") {
      await ingestSourceByKey(adapter.definition.key);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
