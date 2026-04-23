import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  pathname,
  children
}: {
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-8">
      <Sidebar currentPath={pathname} />
      <main className="space-y-6">{children}</main>
    </div>
  );
}
