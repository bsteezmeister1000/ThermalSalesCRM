import { AppShell } from "@/components/layout/app-shell";
import { importManualCsvAction } from "@/app/actions/import-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getManualImportSources } from "@/lib/domain/queries/imports";

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

const sampleCsv = `permit_number,permit_type,work_class,issue_date,status,address,city,state,zip,valuation,builder_name,project_description
MAN-1001,Residential,New Single Family,2026-04-24,Issued,123 Sample Ave,Marion,IA,52302,425000,Example Homes LLC,New single family dwelling`;

type ImportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const [sources, params] = await Promise.all([getManualImportSources(), searchParams]);
  const imported = getParam(params, "imported");
  const rows = getParam(params, "rows");
  const errors = getParam(params, "errors");
  const error = getParam(params, "error");

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

      {imported ? (
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CardTitle>Import complete</CardTitle>
          <CardDescription className="mt-2 text-emerald-800">
            Imported {imported} permits from {rows} CSV rows. {errors === "0" ? "No row errors." : `${errors} row errors were logged.`}
          </CardDescription>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-orange-200 bg-orange-50 text-orange-950">
          <CardTitle>Import needs attention</CardTitle>
          <CardDescription className="mt-2 text-orange-800">{decodeURIComponent(error)}</CardDescription>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge>CSV import</Badge>
            <CardTitle className="mt-4">Bring manual-review rows into the lead queue</CardTitle>
            <CardDescription className="mt-2">
              Paste permit rows from a public export or reviewed spreadsheet. The import preserves raw row data, creates normalized permits, scores leads, and writes a job log entry.
            </CardDescription>
          </div>
          <Badge>{sources.length} manual sources</Badge>
        </div>

        <form action={importManualCsvAction} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">
            Source
            <select
              name="sourceId"
              required
              className="h-11 rounded-2xl border border-border bg-background px-4 text-sm font-medium"
              defaultValue={sources[0]?.id}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} - {source.jurisdiction}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            CSV rows
            <textarea
              name="csv"
              required
              rows={10}
              spellCheck={false}
              className="min-h-64 rounded-2xl border border-border bg-background p-4 font-mono text-xs leading-6"
              defaultValue={sampleCsv}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/70 p-4">
            <p className="text-sm text-muted-foreground">
              Recommended columns: permit_number, permit_type, work_class, issue_date, status, address, city, state, zip, valuation, builder_name, project_description.
            </p>
            <Button type="submit">Import CSV</Button>
          </div>
        </form>
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
