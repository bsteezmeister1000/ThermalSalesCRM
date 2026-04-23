import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function Badge({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-secondary-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
