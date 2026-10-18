import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { athleteName } from "@/features/athletes/lib/names";
import { METHOD_LABEL } from "@/features/finance/lib/methods";
import { payableOf } from "../lib/status";
import { INVOICE_TYPES } from "../schemas";
import { InvoiceActions } from "./InvoiceActions";

export const INVOICE_PAGE_INCLUDE = {
  athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
  lines: { orderBy: { position: "asc" } },
  finances: { where: { isArchived: false }, orderBy: { paymentDate: "desc" } },
  coupon: { select: { name: true } },
  auditLogs: {
    where: { action: { notIn: ["VIEW", "EXPORT", "EXPORT_PDF"] } },
    orderBy: { createdAt: "desc" },
    // ponytail: one invoice gathers a handful of entries; page it if that ever grows
    take: 30,
    select: { id: true, details: true, changes: true, createdAt: true, user: { select: { name: true } } },
  },
} satisfies Prisma.InvoiceInclude;

type Invoice = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_PAGE_INCLUDE }>;

const LABEL: Record<string, string> = { total: "Total", dueDate: "Due", type: "Type", notes: "Notes", lines: "Charges" };

/** "Total Ksh 3,900 → Ksh 4,350 · Charges changed" from an edit's before/after. */
function changesOf(c: unknown) {
  const { before, after } = (c ?? {}) as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  if (!before || !after) return null;
  const show = (k: string, v: unknown) => (k === "total" ? formatCurrency(Number(v)) : k === "type" ? (INVOICE_TYPES.find((t) => t.value === v)?.label ?? String(v)) : String(v || "—"));
  return Object.keys(after)
    .filter((k) => k in LABEL)
    .map((k) => (k === "lines" || k === "notes" ? `${LABEL[k]} changed` : `${LABEL[k]} ${show(k, before[k])} → ${show(k, after[k])}`))
    .join(" · ");
}

const day = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const when = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("tabular mt-0.5 truncate font-display text-xl font-bold md:text-2xl", className)}>{children}</dd>
    </div>
  );
}

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export default function ViewInvoice({ data, issuer }: { data: Invoice; issuer: string }) {
  const total = Number(data.amountDue);
  const discount = Number(data.discount ?? 0);
  const paid = Number(data.amountPaid);
  const balance = Math.max(payableOf({ amountDue: total, discount }) - paid, 0);
  const name = athleteName(data.athlete);
  const late = balance > 0 && data.status !== "CANCELED" && data.dueDate < new Date();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/invoices">
          <ArrowLeft /> Invoices
        </Link>
      </Button>

      <PageHeader
        title={<span className="font-mono normal-case">{data.invoiceNumber}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={data.status} />
            <Link href={`/players/user-profile/${data.athlete.athleteId}`} className="font-medium text-foreground hover:underline">
              {name}
            </Link>
            <span>
              {INVOICE_TYPES.find((t) => t.value === data.type)?.label ?? data.type} · Issued {day(data.createdAt)}
            </span>
          </span>
        }
        actions={
          <InvoiceActions
            id={data.id}
            invoiceNumber={data.invoiceNumber}
            status={data.status}
            balance={balance}
            athlete={{ athleteId: data.athlete.athleteId, name }}
            coupon={data.coupon?.name ?? null}
          />
        }
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <Fact label="Total">{formatCurrency(total - discount)}</Fact>
        <Fact label="Paid" className="text-success">{formatCurrency(paid)}</Fact>
        <Fact label="Balance" className={cn(balance > 0 && data.status !== "CANCELED" ? "text-foreground" : "text-muted-foreground")}>
          {formatCurrency(balance)}
        </Fact>
        <Fact label="Due" className={cn(late && "text-destructive")}>{day(data.dueDate)}</Fact>
      </dl>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Panel title="Charges">
            <ul className="divide-y">
              {data.lines.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-medium">{l.description}</span>
                    {l.quantity > 1 && (
                      <span className="tabular block text-sm text-muted-foreground">
                        {l.quantity} × {formatCurrency(Number(l.unitAmount))}
                      </span>
                    )}
                  </span>
                  <span className="tabular shrink-0 font-medium">{formatCurrency(Number(l.amount))}</span>
                </li>
              ))}
            </ul>
            <dl className="tabular space-y-1.5 border-t bg-muted/30 px-4 py-3 text-sm">
              {discount > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>{formatCurrency(total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount{data.coupon ? ` (${data.coupon.name})` : ""}</dt>
                    <dd>−{formatCurrency(discount)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatCurrency(total - discount)}</dd>
              </div>
            </dl>
            {data.notes && <p className="border-t px-4 py-3 text-sm whitespace-pre-line text-muted-foreground">{data.notes}</p>}
          </Panel>

          <Panel title="Payments">
            {data.finances.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="divide-y">
                {data.finances.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="grid min-w-0 leading-tight">
                      <span className="font-medium">{METHOD_LABEL[p.paymentType]}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {day(p.paymentDate)} · <span className="font-mono text-xs">{p.receiptNumber}</span>
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-medium text-success">{formatCurrency(p.amountPaid)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="xl:col-span-2">
          <Panel title="History">
            <ol className="divide-y">
              {data.auditLogs.map((h) => (
                <li key={h.id} className="px-4 py-3 text-sm">
                  <p>{h.details}</p>
                  {changesOf(h.changes) && <p className="tabular">{changesOf(h.changes)}</p>}
                  <p className="text-muted-foreground">
                    {h.user?.name ?? "System"} · {when(h.createdAt)}
                  </p>
                </li>
              ))}
              <li className="px-4 py-3 text-sm">
                <p>Issued</p>
                <p className="text-muted-foreground">
                  {issuer} · {when(data.createdAt)}
                </p>
              </li>
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
