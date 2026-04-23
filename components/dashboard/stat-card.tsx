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
    <Card className="relative overflow-hidden border-slate-200 bg-white">
      <Badge className="mb-4 bg-slate-100 text-slate-700">{label}</Badge>
      <CardTitle className="text-4xl text-slate-950">{value}</CardTitle>
      <CardDescription className="mt-2 max-w-[26ch] text-slate-500">{hint}</CardDescription>
      <ArrowUpRight className="absolute right-5 top-5 h-5 w-5 text-slate-300" />
    </Card>
  );
}
