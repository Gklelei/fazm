"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileDown, Loader2, Mail, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { GetAthleteByIdQueryType } from "@/features/athletes/queries";
import { buildStatement } from "@/features/finance/lib/statement";
import { emailStatement } from "@/features/finance/actions/email-statement";
import { formatAcademy } from "@/lib/academy-time";
import { cn } from "@/lib/utils";

const kes = (n: number) =>
  `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const day = (d: string) =>
  formatAcademy(new Date(`${d}T12:00:00+03:00`), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const KIND = {
  CHARGE: "Charge",
  DISCOUNT: "Discount",
  PAYMENT: "Payment",
} as const;

/** Charges, discounts and payments with a running balance, for a chosen period. */
export default function AthleteStatement({
  data,
  canSend = false,
}: {
  data: GetAthleteByIdQueryType;
  canSend?: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sending, start] = useTransition();
  const statement = useMemo(
    () =>
      buildStatement({
        invoices: data.invoices ?? [],
        payments: data.finances ?? [],
        from: from || undefined,
        to: to || undefined,
      }),
    [data, from, to],
  );
  const { lines, opening, closing } = statement;
  const range = new URLSearchParams({
    ...(from && { from }),
    ...(to && { to }),
  }).toString();

  const send = () =>
    start(async () => {
      const res = await emailStatement(
        data.athleteId,
        from || undefined,
        to || undefined,
      );
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <CardTitle className="text-xl font-bold">Account Statement</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Running balance and transaction history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <span className="block text-sm text-muted-foreground">
              {to ? "Closing balance" : "Current Balance"}
            </span>
            <span
              className={cn(
                "text-lg font-bold",
                closing > 0 ? "text-destructive" : "text-success",
              )}
            >
              {kes(closing)}
            </span>
          </div>
          <ExportDropdown
            filename={`${data.firstName}_${data.lastName}_Statement`}
            headers={[
              "Date",
              "Description",
              "Reference",
              "Charge (Out)",
              "Credit (In)",
              "Running Balance",
            ]}
            rows={[
              ...(from
                ? [
                    [
                      day(from),
                      "Balance brought forward",
                      "",
                      "",
                      "",
                      String(opening),
                    ],
                  ]
                : []),
              ...lines.map((l) => [
                day(l.day),
                l.description,
                l.reference,
                l.charge ? String(l.charge) : "",
                l.credit ? String(l.credit) : "",
                String(l.balance),
              ]),
            ]}
          />
          {canSend && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/athlete/${data.athleteId}/statement${range ? `?${range}` : ""}`}
                  target="_blank"
                  rel="noopener"
                >
                  <FileDown /> PDF
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={send}
                disabled={sending}
              >
                {sending ? <Loader2 className="animate-spin" /> : <Mail />}{" "}
                Email to guardian
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="st-from">From</Label>
            <Input
              id="st-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="st-to">To</Label>
            <Input
              id="st-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              <X /> All time
            </Button>
          )}
        </div>

        {lines.length === 0 && !from ? (
          <div className="py-12 text-center text-muted-foreground">
            No financial records found for this athlete.
          </div>
        ) : (
          <>
            {/* Phones: one row per entry */}
            <ul className="divide-y rounded-md border md:hidden">
              {from && (
                <li className="flex justify-between gap-3 bg-muted/30 px-3 py-2.5 text-sm">
                  <span className="font-medium">
                    Brought forward · {day(from)}
                  </span>
                  <span className="font-bold tabular-nums">{kes(opening)}</span>
                </li>
              )}
              {lines.map((l) => (
                <li
                  key={l.key}
                  className="flex items-start justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {l.description}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {day(l.day)} · {l.reference}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm tabular-nums">
                    <p
                      className={cn(
                        "font-medium",
                        l.charge ? "text-destructive" : "text-success",
                      )}
                    >
                      {l.charge ? `+${kes(l.charge)}` : `−${kes(l.credit)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {kes(l.balance)}
                    </p>
                  </div>
                </li>
              ))}
              {lines.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nothing in this period.
                </li>
              )}
              <li className="flex justify-between gap-3 px-3 py-2.5 text-sm font-semibold">
                <span>Closing balance</span>
                <span className="font-bold tabular-nums">{kes(closing)}</span>
              </li>
            </ul>

            <div className="hidden overflow-hidden rounded-md border md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right text-destructive">
                      Charge (Out)
                    </TableHead>
                    <TableHead className="text-right text-success">
                      Paid / discount (In)
                    </TableHead>
                    <TableHead className="text-right font-bold">
                      Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {from && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="text-sm">{day(from)}</TableCell>
                      <TableCell colSpan={4} className="text-sm font-medium">
                        Balance brought forward
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {kes(opening)}
                      </TableCell>
                    </TableRow>
                  )}
                  {lines.map((l) => (
                    <TableRow key={l.key}>
                      <TableCell className="text-sm">{day(l.day)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {l.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {KIND[l.kind]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase"
                        >
                          {l.reference}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {l.charge ? kes(l.charge) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {l.credit ? kes(l.credit) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {kes(l.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Nothing in this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">
                      {to ? `Closing balance, ${day(to)}` : "Closing balance"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {kes(statement.charges)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {kes(statement.credits)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {kes(closing)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
