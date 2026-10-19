"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, Banknote, Check, Eye, FileDown, Loader2, MoreHorizontal, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { hasRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/providers/SessionProvider";
import { approveMonth, decideAdvance, markPaid, refreshMonth } from "../actions/payroll";
import type { AdvanceRow, PayrollMonth, PayslipRow } from "../queries";
import { ADVANCE_METHODS } from "../schemas";
import { AdvanceDialog } from "./AdvanceDialog";
import { PayslipDialog } from "./PayslipDialog";

const label = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const day = (d: string) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const RUN_LABEL = { PROVISIONAL: "Provisional", APPROVED: "Approved", PAID: "Paid" } as const;
const methodLabel = (m: string) => ADVANCE_METHODS.find((x) => x.value === m)?.label ?? m;
const basisOf = (p: PayslipRow) => (p.basis === "PER_SESSION" ? `${p.sessions ?? 0} sessions` : "Monthly");

const exportRow = (p: PayslipRow, i: number) => [
  String(i + 1),
  p.staff.fullNames,
  p.staff.staffId,
  basisOf(p),
  String(p.gross),
  String(p.deductions - p.advance),
  String(p.advance),
  String(p.net),
  p.staff.payMethod === "BANK" ? "Bank" : p.staff.payMethod === "MPESA" ? "M-Pesa" : "",
  p.staff.payAccount ?? "",
];

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ success: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });
  return { pending, run };
}

function SlipMenu({ slip, onOpen }: { slip: PayslipRow; onOpen: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${slip.staff.fullNames}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpen}>
          <Eye /> Open payslip
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/payslips/${slip.id}`} target="_blank" rel="noopener">
            <FileDown /> Payslip PDF
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/staff/${slip.staff.staffId}`}>
            <Eye /> Staff page
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Payslips({ month, data, isAdmin }: { month: string; data: PayrollMonth | null; isAdmin: boolean }) {
  const isMobile = useIsMobile();
  const { pending, run } = useRun();
  const [openId, setOpenId] = useState<string | null>(null);
  const slips = data?.payslips ?? [];
  const locked = !!data && data.status !== "PROVISIONAL";
  const sum = (k: "gross" | "deductions" | "net" | "employer" | "advance") => slips.reduce((s, p) => s + p[k], 0);
  const overCap = slips.filter((p) => p.overCap).length;
  const open = slips.find((p) => p.id === openId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Gross pay" value={formatCurrency(sum("gross"))} note={`${slips.length} payslips`} />
        <StatCard label="Deductions" value={formatCurrency(sum("deductions") - sum("advance"))} note={sum("advance") ? `${formatCurrency(sum("advance"))} advances on top` : undefined} />
        <StatCard label="Net to pay" value={formatCurrency(sum("net"))} tone="success" />
        <StatCard label="Employer cost" value={formatCurrency(sum("gross") + sum("employer"))} note={sum("employer") ? `${formatCurrency(sum("employer"))} contributions` : undefined} />
      </div>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={data?.status ?? "PROVISIONAL"}>{data ? RUN_LABEL[data.status] : "Not worked out"}</StatusBadge>
            {data?.approvedAt && <span className="text-muted-foreground">Approved {day(data.approvedAt)}</span>}
            {data?.paidAt && <span className="text-muted-foreground">· Paid {day(data.paidAt)}</span>}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <ExportDropdown<PayslipRow>
              filename={`Payroll ${label(month)}`}
              headers={["#", "Name", "Staff ID", "Basis", "Gross (KES)", "Deductions (KES)", "Advance (KES)", "Net (KES)", "Pay by", "Account"]}
              rows={slips.map(exportRow)}
            />
            {!locked && (
              <Button variant="outline" disabled={pending} onClick={() => run(() => refreshMonth(month))}>
                {pending ? <Loader2 className="animate-spin" /> : <RefreshCcw />} {data ? "Work out again" : "Work out payslips"}
              </Button>
            )}
            {!locked && isAdmin && slips.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={pending}>
                    <BadgeCheck /> Approve {label(month)}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve {label(month)}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The payslips are worked out once more, then locked. {formatCurrency(sum("gross") + sum("employer"))} goes to expenses under Salaries.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => run(() => approveMonth(month))}>Approve</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {data?.status === "APPROVED" && (
              <Button disabled={pending} onClick={() => run(() => markPaid(month))}>
                <Banknote /> Mark as paid
              </Button>
            )}
          </div>
        </div>

        {overCap > 0 && (
          <p className="flex items-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm">
            <AlertTriangle className="size-4 text-warning" />
            {overCap === 1 ? "1 payslip takes" : `${overCap} payslips take`} more than two-thirds of gross pay. Open {overCap === 1 ? "it" : "them"} to move some of the advance to next month.
          </p>
        )}

        {slips.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">{data ? "No one has a pay profile yet." : `No payslips for ${label(month)} yet.`}</p>
            <p className="text-sm text-muted-foreground">{data ? "Set pay on each staff member's page." : "They're worked out on the last day of the month, or now."}</p>
            {!locked && (
              <Button disabled={pending} onClick={() => run(() => refreshMonth(month))}>
                {pending ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Work out payslips
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="divide-y">
            {slips.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpenId(p.id)} className="grid min-w-0 gap-1 text-left leading-tight">
                  <span className="truncate font-semibold">{p.staff.fullNames}</span>
                  <span className="text-sm text-muted-foreground">
                    {basisOf(p)} · gross {formatCurrency(p.gross)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-bold">{formatCurrency(p.net)}</span>
                    {p.overCap && <StatusBadge tone="warning">Over two-thirds</StatusBadge>}
                  </span>
                </button>
                <SlipMenu slip={p} onOpen={() => setOpenId(p.id)} />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Advance</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
                <TableHead>Pay by</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slips.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenId(p.id)}>
                  <TableCell className="pl-4">
                    <span className="block font-medium">{p.staff.fullNames}</span>
                    <span className="text-xs text-muted-foreground">{p.staff.jobTitle || p.staff.staffId}</span>
                  </TableCell>
                  <TableCell className="text-sm">{basisOf(p)}</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(p.gross)}</TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">{formatCurrency(p.deductions - p.advance)}</TableCell>
                  <TableCell className={cn("tabular text-right", p.advance ? "" : "text-muted-foreground")}>
                    {p.advance ? formatCurrency(p.advance) : "—"}
                    {p.overCap && <AlertTriangle className="ml-1 inline size-3.5 text-warning" aria-label="Over two-thirds of gross" />}
                  </TableCell>
                  <TableCell className="tabular text-right font-bold">{formatCurrency(p.net)}</TableCell>
                  <TableCell className="text-sm">
                    {p.staff.payMethod ? (
                      <>
                        <span className="block">{p.staff.payMethod === "BANK" ? "Bank" : "M-Pesa"}</span>
                        <span className="font-mono text-xs text-muted-foreground">{p.staff.payAccount}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <SlipMenu slip={p} onOpen={() => setOpenId(p.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-4 font-semibold" colSpan={2}>
                  Total
                </TableCell>
                <TableCell className="tabular text-right font-semibold">{formatCurrency(sum("gross"))}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatCurrency(sum("deductions") - sum("advance"))}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatCurrency(sum("advance"))}</TableCell>
                <TableCell className="tabular text-right font-bold">{formatCurrency(sum("net"))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </section>
      {open && <PayslipDialog key={open.id + JSON.stringify(open.adjustments)} slip={open} locked={locked} open onOpenChange={(v) => !v && setOpenId(null)} />}
    </div>
  );
}

export function AdvancesTable({ advances, isAdmin, showStaff = true }: { advances: AdvanceRow[]; isAdmin: boolean; showStaff?: boolean }) {
  const { pending, run } = useRun();
  if (!advances.length) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No advances being paid back.</p>;
  return (
    <ul className="divide-y">
      {advances.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="grid min-w-0 flex-1 gap-0.5 leading-tight">
            {showStaff && (
              <Link href={`/staff/${a.staff.staffId}`} className="truncate font-semibold hover:underline">
                {a.staff.fullNames}
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              {formatCurrency(a.amount)} · {day(a.date)} · {methodLabel(a.method)}
              {a.reference && <span className="font-mono"> {a.reference}</span>} · {a.months === 1 ? "next payslip" : `over ${a.months} months`}
            </span>
            {a.reason && <span className="text-sm">{a.reason}</span>}
          </div>
          {a.status === "PENDING" ? (
            isAdmin ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => decideAdvance(a.id, false))}>
                  <X /> Turn down
                </Button>
                <Button size="sm" disabled={pending} onClick={() => run(() => decideAdvance(a.id, true))}>
                  <Check /> Approve
                </Button>
              </div>
            ) : (
              <StatusBadge status="PENDING">Waiting for approval</StatusBadge>
            )
          ) : (
            <div className="text-right">
              <span className="tabular block font-bold">{formatCurrency(a.outstanding)}</span>
              <span className="text-xs text-muted-foreground">left of {formatCurrency(a.amount)}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function PayrollPage({
  month,
  months,
  data,
  advances,
  staff,
  tab,
}: {
  month: string;
  months: string[];
  data: PayrollMonth | null;
  advances: AdvanceRow[];
  staff: { id: string; fullNames: string }[];
  tab: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = hasRole(useAuthSession().user.role, "admin");
  const go = (p: Record<string, string>) => router.replace(`${pathname}?${new URLSearchParams({ month, tab, ...p })}`, { scroll: false });
  const pending = advances.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Payslips, deductions and advances."
        actions={
          <>
            <div className="grid gap-1.5">
              <Label className="sr-only">Month</Label>
              <Select value={month} onValueChange={(m) => go({ month: m })}>
                <SelectTrigger className="w-44" aria-label="Month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {label(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AdvanceDialog staff={staff} />
          </>
        }
      />
      <Tabs value={tab} onValueChange={(t) => go({ tab: t })}>
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="advances">
            Advances
            {pending > 0 && <span className="ml-1.5 rounded-full bg-warning px-1.5 text-xs font-semibold text-warning-foreground">{pending}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payslips" className="mt-4">
          <Payslips month={month} data={data} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="advances" className="mt-4">
          <section className="overflow-hidden rounded-lg border bg-card">
            <AdvancesTable advances={advances} isAdmin={isAdmin} />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
