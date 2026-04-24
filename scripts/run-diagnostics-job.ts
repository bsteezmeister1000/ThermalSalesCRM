import { runSourceDiagnostics } from "@/lib/domain/ingestion/service";
import { syncSourceRegistry } from "@/lib/domain/ingestion/source-registry";

async function main() {
  await syncSourceRegistry();
  const diagnostics = await runSourceDiagnostics();
  console.log(JSON.stringify(diagnostics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
