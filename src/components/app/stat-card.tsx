import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";

// Card KPI — pattern dell'overview di dashboard-starter, numero animato con Magic UI.
export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold">
          <NumberTicker value={value} className="font-semibold text-near-black" />
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
