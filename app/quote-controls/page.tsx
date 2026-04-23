import { AppShell } from "@/components/layout/app-shell";
import { QuoteControlPanel } from "@/components/quote/quote-control-panel";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function QuoteControlsPage() {
  return (
    <AppShell pathname="/quote-controls">
      <Card>
        <CardTitle>Quote Controls</CardTitle>
        <CardDescription className="mt-2">
          Operational control panel for shelving quote behavior. Inputs are grouped by quoting priority, laminate settings are
          isolated from standard shelving logic, and reference tables stay secondary.
        </CardDescription>
      </Card>
      <QuoteControlPanel />
    </AppShell>
  );
}
