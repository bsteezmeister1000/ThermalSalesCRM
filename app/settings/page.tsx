import { AppShell } from "@/components/layout/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getScoringSettings } from "@/lib/domain/queries/settings";

export default async function SettingsPage() {
  const settings = await getScoringSettings();

  return (
    <AppShell pathname="/settings">
      <Card className="border-slate-200 bg-white">
        <CardTitle>Settings</CardTitle>
        <CardDescription className="mt-2">
          Scoring remains configurable, but the product focus is permit-driven insulation lead tracking.
        </CardDescription>
      </Card>
      <Card className="border-slate-200 bg-white">
        <CardTitle>Scoring rules</CardTitle>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-slate-100">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </Card>
    </AppShell>
  );
}
