"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";

const config = {
  collected: { label: "Collected", color: "var(--chart-1)" },
  spent: { label: "Spent", color: "var(--chart-4)" },
} satisfies ChartConfig;

const compact = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });

/** Collected (and spent, when expenses exist) per day or month of the range. */
export function TrendChart({
  data,
  showSpent,
}: {
  data: { key: string; label: string; collected: number; spent: number }[];
  showSpent: boolean;
}) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent formatter={(v, name) => `${config[name as keyof typeof config]?.label ?? name}: ${formatCurrency(Number(v))}`} />}
        />
        {showSpent && <ChartLegend content={<ChartLegendContent />} />}
        <Bar dataKey="collected" fill="var(--color-collected)" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        {showSpent && (
          <Bar dataKey="spent" fill="var(--color-spent)" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        )}
      </BarChart>
    </ChartContainer>
  );
}
