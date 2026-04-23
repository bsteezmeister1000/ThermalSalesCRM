import type { Route } from "next";
import Link from "next/link";
import { BarChart3, Building2, FileStack, MapPinned, Settings2, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const links: Array<{ href: Route; label: string; icon: typeof BarChart3 }> = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/permits", label: "Permits", icon: MapPinned },
  { href: "/leads", label: "Leads", icon: FileStack },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/sources", label: "Source Health", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="sticky top-6 h-fit rounded-[32px] border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Thermal Lead Tracker
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">Insulation sales control panel</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Cedar Rapids corridor permits, enrichment, scoring, and CRM review in one place.
        </p>
      </div>
      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            currentPath === link.href ||
            (link.href === "/leads" && currentPath.startsWith("/leads")) ||
            (link.href === "/permits" && currentPath.startsWith("/permits"));
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
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
