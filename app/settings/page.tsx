import { AppShell } from "@/components/layout/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getScoringSettings } from "@/lib/domain/queries/settings";

export default async function SettingsPage() {
  const settings = await getScoringSettings();

  return (
    <AppShell pathname="/settings">
      <Card>
        <CardTitle>Scoring rules</CardTitle>
        <CardDescription className="mt-2">
          Explainable, tunable scoring weights. These are config-driven so the owner can iterate without replacing the core
          workflow.
        </CardDescription>
      </Card>
      <Card>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </Card>
    </AppShell>
  );
}
