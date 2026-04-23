import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const importModes = [
  {
    title: "Manual XLSX / CSV import",
    description:
      "For jurisdictions where a downloadable report is available or when public automation is intentionally disabled."
  },
  {
    title: "Saved URL review",
    description:
      "Store portal URLs and notes when public pages are usable by a human reviewer but not suitable for resilient scraping."
  },
  {
    title: "Fixture-backed regression samples",
    description:
      "Keep sample documents/pages that protect parsers from silent breakage over time."
  }
];

export default function ImportsPage() {
  return (
    <AppShell pathname="/imports">
      <Card>
        <Badge>Manual review workflow</Badge>
        <CardTitle className="mt-4">Imports</CardTitle>
        <CardDescription className="mt-2">
          This MVP treats import workflows as first-class, not fallback glue. When a source is partial or manual-review only,
          operators still need a clean path to bring in public data safely.
        </CardDescription>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {importModes.map((mode) => (
          <Card key={mode.title}>
            <CardTitle>{mode.title}</CardTitle>
            <CardDescription className="mt-3">{mode.description}</CardDescription>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
