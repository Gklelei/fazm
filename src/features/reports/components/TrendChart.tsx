"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";
import { bucketRange } from "../lib/drill";
import { useDrill } from "./Drill";
import type { Series } from "../queries/records";

type Point = { key: string; label: string; fees: number; shop: number; collected: number; spent: number; lastYear: number };

const compact = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });
const money = (config: ChartConfig) => (v: unknown, name: unknown) => `${config[name as string]?.label ?? name}: ${formatCurrency(Number(v))}`;

/** Opens a bar's records: the series it belongs to, for that day or month. */
function useBarClick(titles: Partial<Record<Series, string>>) {
  const { open, range } = useDrill();
  return (series: Series) => (bar: { payload?: Point }) => {
    if (!bar.payload) return;
    const [from, to] = bucketRange(bar.payload.key, range.from, range.to);
    open({ title: `${titles[series]} · ${bar.payload.label}`, series, from, to });
  };
}

const inOut = {
  collected: { label: "Money in", color: "var(--chart-1)" },
  spent: { label: "Spent", color: "var(--chart-4)" },
} satisfies ChartConfig;

/** Money in (fees and shop) and spent, per day or month of the range. */
export function TrendChart({ data, showSpent }: { data: Point[]; showSpent: boolean }) {
  const click = useBarClick({ income: "Money in", spent: "Spent" });
  return (
    <ChartContainer config={inOut} className="aspect-auto h-72 w-full [&_.recharts-bar-rectangle]:cursor-pointer">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatter={money(inOut)} />} />
        {showSpent && <ChartLegend content={<ChartLegendContent />} />}
        <Bar dataKey="collected" fill="var(--color-collected)" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} onClick={click("income")} />
        {showSpent && <Bar dataKey="spent" fill="var(--color-spent)" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} onClick={click("spent")} />}
      </BarChart>
    </ChartContainer>
  );
}

const bySource = {
  fees: { label: "Fees", color: "var(--chart-1)" },
  shop: { label: "Shop", color: "var(--chart-2)" },
  lastYear: { label: "Same time last year", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

/** Fees and shop side by side, with last year's income as a line. */
export function SourceChart({ data, showLastYear }: { data: Point[]; showLastYear: boolean }) {
  const click = useBarClick({ fees: "Fees", shop: "Shop" });
  return (
    <ChartContainer config={bySource} className="aspect-auto h-72 w-full [&_.recharts-bar-rectangle]:cursor-pointer">
      <ComposedChart data={data} margin={{ left: 0, right: 4, top: 8 }} barGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatter={money(bySource)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="fees" fill="var(--color-fees)" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} onClick={click("fees")} />
        <Bar dataKey="shop" fill="var(--color-shop)" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} onClick={click("shop")} />
        {showLastYear && <Line dataKey="lastYear" type="monotone" stroke="var(--color-lastYear)" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />}
      </ComposedChart>
    </ChartContainer>
  );
}
