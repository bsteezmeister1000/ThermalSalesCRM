import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[28px] border border-border/80 bg-card p-6 shadow-panel",
        props.className
      )}
    />
  );
}

export function CardTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={cn("text-lg font-semibold tracking-tight", props.className)} />;
}

export function CardDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={cn("text-sm leading-6 text-muted-foreground", props.className)}
    />
  );
}
