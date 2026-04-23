import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <Badge className="mb-4 bg-primary/10 text-primary">{label}</Badge>
      <CardTitle className="text-4xl">{value}</CardTitle>
      <CardDescription className="mt-2 max-w-[26ch]">{hint}</CardDescription>
      <ArrowUpRight className="absolute right-5 top-5 h-5 w-5 text-primary/30" />
    </Card>
  );
}
