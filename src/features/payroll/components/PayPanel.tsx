"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { decideAdvance } from "../actions/payroll";
import type { PayslipSummary } from "../queries";
import type { advanceBalances } from "../lib/run";
import { ADVANCE_METHODS } from "../schemas";
import { AdvanceDialog } from "./AdvanceDialog";

type Advance = Awaited<ReturnType<typeof advanceBalances>>[number];
const label = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const day = (d: string) => formatAcademy(`${d}T12:00:00+03:00`, { day: "numeric", month: "short", year: "numeric" });
const ADVANCE_LABEL = { PENDING: "Waiting for approval", APPROVED: "Approved", REJECTED: "Turned down" } as const;

/** Payslips and the advance ledger, on the staff page and in "My pay". */
export function PayPanel({ staffId, advances, payslips, canRecord = false, isAdmin = false }: { staffId?: string; advances: Advance[]; payslips: PayslipSummary[]; canRecord?: boolean; isAdmin?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const owed = advances.reduce((s, a) => s + a.outstanding, 0);
  const decide = (id: string, ok: boolean) =>
    start(async () => {
      const res = await decideAdvance(id, ok);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-semibold">Payslips</p>
        {payslips.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {payslips.map((p) => (
              <li key={p.id}>
                <a href={`/api/payslips/${p.id}`} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/40">
                  <span className="grid leading-tight">
                    <span className="font-medium">{label(p.month)}</span>
                    {p.status === "PROVISIONAL" && <span className="text-xs text-muted-foreground">Provisional, subject to change by the admin</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-semibold">{formatCurrency(p.net)}</span>
                    <FileDown className="size-4 text-muted-foreground" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            Advances{owed > 0 && <span className="ml-2 font-normal text-muted-foreground">{formatCurrency(owed)} to pay back</span>}
          </p>
          {canRecord && staffId && <AdvanceDialog staff={[]} fixedStaffId={staffId} />}
        </div>
        {advances.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {advances.map((a) => (
              <li key={a.id} className="grid gap-1 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {formatCurrency(a.amount)} <span className="font-normal text-muted-foreground">· {day(a.date)}</span>
                  </span>
                  {a.status === "APPROVED" ? (
                    <span className="tabular text-right font-semibold">{a.outstanding > 0 ? `${formatCurrency(a.outstanding)} left` : "Paid back"}</span>
                  ) : (
                    <StatusBadge status={a.status}>{ADVANCE_LABEL[a.status]}</StatusBadge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {ADVANCE_METHODS.find((m) => m.value === a.method)?.label}
                  {a.reference && ` ${a.reference}`} · {a.months === 1 ? "next payslip" : `over ${a.months} months`}
                  {a.reason && ` · ${a.reason}`}
                </span>
                {a.recoveries.length > 0 && <span className="text-xs text-muted-foreground">Taken back: {a.recoveries.map((r) => `${label(r.month)} ${formatCurrency(r.amount)}`).join(", ")}</span>}
                {a.status === "PENDING" && isAdmin && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => decide(a.id, false)}>
                      <X /> Turn down
                    </Button>
                    <Button size="sm" disabled={pending} onClick={() => decide(a.id, true)}>
                      <Check /> Approve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
