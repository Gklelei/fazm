"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";

const config = {
  total: { label: "Collected", color: "var(--chart-1)" },
} satisfies ChartConfig;

const compact = new Intl.NumberFormat("en-KE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Monthly collections; the current month is picked out in crest gold. */
export function IncomeChart({
  data,
}: {
  data: { key: string; label: string; total: number }[];
}) {
  const last = data.length - 1;
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => compact.format(v)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              formatter={(v) => formatCurrency(Number(v))}
              hideIndicator
            />
          }
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((d, i) => (
            <Cell
              key={d.key}
              fill={i === last ? "var(--brand-gold)" : "var(--color-total)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
