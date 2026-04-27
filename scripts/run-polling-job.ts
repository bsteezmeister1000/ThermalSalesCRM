import { runDueAutomatedSources } from "@/lib/domain/ingestion/service";
import { syncRegisteredSourceDefaults } from "@/lib/repositories/source-repository";

async function main() {
  await syncRegisteredSourceDefaults();
  const results = await runDueAutomatedSources();

  for (const result of results) {
    if (result.ran) {
      console.log(
        `${result.sourceKey}: ran, permits=${result.result?.permitsUpserted ?? 0}, errors=${result.result?.errors.length ?? 0}`
      );
    } else {
      console.log(`${result.sourceKey}: skipped, ${result.reason}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
