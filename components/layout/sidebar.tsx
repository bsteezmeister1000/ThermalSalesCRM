import Link from "next/link";
import { BarChart3, Building2, Calculator, Database, FileStack, Settings2, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/?view=queue", label: "Lead Queue", icon: FileStack },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/quote-controls", label: "Quote Controls", icon: Calculator },
  { href: "/sources", label: "Sources & Health", icon: ShieldCheck },
  { href: "/imports", label: "Imports", icon: Database },
  { href: "/settings", label: "Scoring Rules", icon: Settings2 }
] as const;

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="sticky top-6 h-fit rounded-[32px] border border-border/80 bg-card/90 p-5 shadow-panel">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Thermal Lead Tracker
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Insulation market workflow</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Cedar Rapids corridor permits, enrichment, scoring, and CRM review in one place.
        </p>
      </div>
      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            currentPath === link.href ||
            (link.href === "/?view=queue" && currentPath.startsWith("/leads"));
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
