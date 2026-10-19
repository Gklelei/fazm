import Link from "next/link";
import { ArrowLeft, Banknote, History } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
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
  athlete: {
    select: {
      athleteId: true,
      firstName: true,
      middleName: true,
      lastName: true,
      batches: { select: { name: true } },
      guardians: { select: { fullNames: true, phoneNumber: true }, take: 1 },
    },
  },
  lines: { orderBy: { position: "asc" } },
  finances: { where: { isArchived: false }, orderBy: { paymentDate: "desc" } },
  coupon: { select: { name: true } },
  auditLogs: {
    where: { action: { notIn: ["VIEW", "EXPORT", "EXPORT_PDF"] } },
    orderBy: { createdAt: "desc" },
    // One invoice gathers a handful of entries; page it if that ever grows
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

export type InvoiceLetterhead = {
  academyName: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  /** Rows from howToPay(): method, account number, bank */
  pay: { label: string; value: string }[];
  footer: string | null;
  kraPin: string | null;
  terms: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
};

/** A titled card on the side rail; empty ones say so in one quiet line. */
function RailCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

export default function ViewInvoice({ data, issuer, letterhead: lh }: { data: Invoice; issuer: string; letterhead: InvoiceLetterhead }) {
  const total = Number(data.amountDue);
  const discount = Number(data.discount ?? 0);
  const paid = Number(data.amountPaid);
  const payable = payableOf({ amountDue: total, discount });
  const balance = Math.max(payable - paid, 0);
  const name = athleteName(data.athlete);
  const guardian = data.athlete.guardians[0];
  const cancelled = data.status === "CANCELED";
  const late = balance > 0 && !cancelled && data.dueDate < new Date();
  const share = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 100;
  const type = INVOICE_TYPES.find((t) => t.value === data.type)?.label ?? data.type;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground print:hidden">
        <Link href="/invoices">
          <ArrowLeft /> Invoices
        </Link>
      </Button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* The rail: balance and actions first on a phone */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2 print:hidden">
          <section className="overflow-hidden rounded-xl bg-brand-navy text-white shadow-sm dark:ring-1 dark:ring-white/10">
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-white/70">{data.invoiceNumber}</p>
                  <Link href={`/players/user-profile/${data.athlete.athleteId}`} className="block truncate font-semibold hover:underline">
                    {name}
                  </Link>
                </div>
                <StatusBadge status={data.status} className="border-transparent bg-white text-brand-navy dark:text-brand-navy" />
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-white/60 uppercase">{cancelled ? "Cancelled" : balance > 0 ? "Balance due" : "Paid in full"}</p>
                <p className={cn("tabular font-display text-4xl leading-tight font-bold", cancelled ? "text-white/50 line-through" : "text-brand-gold")}>
                  {formatCurrency(cancelled ? payable : balance)}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
                  <div className="h-full rounded-full bg-brand-gold" style={{ width: `${share}%` }} />
                </div>
                <p className="tabular mt-1.5 text-sm text-white/70">
                  {formatCurrency(paid)} paid of {formatCurrency(payable)}
                </p>
              </div>
              <p className={cn("text-sm", late ? "font-medium text-[oklch(0.8_0.12_25)]" : "text-white/70")}>
                {late ? "Overdue since" : "Due"} {day(data.dueDate)}
              </p>
            </div>
            <div className="border-t border-white/10 bg-white/5 p-4">
              <InvoiceActions
                id={data.id}
                invoiceNumber={data.invoiceNumber}
                status={data.status}
                balance={balance}
                athlete={{ athleteId: data.athlete.athleteId, name }}
                coupon={data.coupon?.name ?? null}
              />
            </div>
          </section>

          <RailCard icon={Banknote} title="Payments">
            {data.finances.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y border-t">
                {data.finances.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="grid min-w-0 leading-tight">
                      <span className="font-medium">{METHOD_LABEL[p.paymentType]}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {day(p.paymentDate)} · <span className="font-mono">{p.receiptNumber}</span>
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-semibold text-success">{formatCurrency(p.amountPaid)}</span>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          <RailCard icon={History} title="History">
            <ol className="space-y-3 px-4 pb-4">
              {[...data.auditLogs.map((h) => ({ id: h.id, what: h.details, change: changesOf(h.changes), who: h.user?.name ?? "System", at: h.createdAt })), { id: "issued", what: "Issued", change: null, who: issuer, at: data.createdAt }].map((h) => (
                <li key={h.id} className="relative border-l-2 border-primary/25 pl-3 text-sm">
                  <p>{h.what}</p>
                  {h.change && <p className="tabular text-muted-foreground">{h.change}</p>}
                  <p className="text-xs text-muted-foreground">
                    {h.who} · {when(h.at)}
                  </p>
                </li>
              ))}
            </ol>
          </RailCard>
        </aside>

        {/* The invoice itself, as the parent sees it; prints on its own */}
        <article id="print-receipt" className="overflow-hidden rounded-xl border bg-card shadow-sm lg:order-1 print:rounded-none print:border-0 print:shadow-none">
          <div className="h-1.5 bg-brand-gold" aria-hidden />
          <div className="space-y-8 p-6 sm:p-10">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- academy logo (a private upload or the bundled crest) */}
                <img src={lh.logoUrl || "/Fazam Logo Half.jpg"} alt="" className="size-16 rounded-md object-cover" />
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p className="text-base font-bold text-foreground">{lh.academyName}</p>
                  {lh.address && <p>{lh.address}</p>}
                  {lh.contactPhone && <p>{lh.contactPhone}</p>}
                  {lh.contactEmail && <p>{lh.contactEmail}</p>}
                  {lh.kraPin && <p>KRA PIN {lh.kraPin}</p>}
                </div>
              </div>
              <div className="sm:text-right">
                <p className="font-display text-5xl leading-none font-black tracking-tight text-primary/15 uppercase print:text-primary">Invoice</p>
                <p className="mt-2 font-mono text-sm font-medium">{data.invoiceNumber}</p>
                <dl className="mt-1 text-sm text-muted-foreground">
                  <div>
                    <dt className="inline">Issued </dt>
                    <dd className="inline">{day(data.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline">Due </dt>
                    <dd className={cn("inline font-semibold", late ? "text-destructive" : "text-foreground")}>{day(data.dueDate)}</dd>
                  </div>
                </dl>
              </div>
            </header>

            <div className="grid gap-6 border-y py-6 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Billed to</p>
                <p className="text-base font-semibold">{name}</p>
                <p className="text-muted-foreground">
                  <span className="font-mono">{data.athlete.athleteId}</span>
                  {data.athlete.batches && ` · ${data.athlete.batches.name}`}
                </p>
                {guardian && (
                  <p className="text-muted-foreground">
                    {guardian.fullNames}
                    {guardian.phoneNumber && ` · ${guardian.phoneNumber}`}
                  </p>
                )}
              </div>
              <div className="space-y-1 text-sm sm:text-right">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">For</p>
                <p className="font-medium">{type}</p>
                {data.coupon && <p className="text-muted-foreground">Coupon {data.coupon.name}</p>}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="pb-2">Description</th>
                  <th className="w-12 pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right max-sm:hidden">Unit price</th>
                  <th className="pb-2 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 pr-3 font-medium">{l.description}</td>
                    <td className="tabular py-3 text-right">{l.quantity}</td>
                    <td className="tabular py-3 text-right max-sm:hidden">{formatCurrency(Number(l.unitAmount))}</td>
                    <td className="tabular py-3 pl-4 text-right font-medium whitespace-nowrap">{formatCurrency(Number(l.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <dl className="tabular w-full space-y-1.5 text-sm sm:w-72">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatCurrency(total)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{data.coupon ? `Discount (${data.coupon.name})` : data.siblingDiscount ? "Sibling discount" : "Discount"}</dt>
                    <dd>−{formatCurrency(discount)}</dd>
                  </div>
                )}
                {paid > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="text-success">−{formatCurrency(paid)}</dd>
                  </div>
                )}
                <div className="flex justify-between rounded-md bg-brand-navy px-3 py-2 text-base font-bold text-white dark:bg-white/10 print:bg-transparent print:px-0 print:text-black">
                  <dt>Balance due</dt>
                  <dd className="text-brand-gold">{formatCurrency(balance)}</dd>
                </div>
              </dl>
            </div>

            {data.notes && <p className="text-sm whitespace-pre-line text-muted-foreground">{data.notes}</p>}

            {lh.pay.length > 0 && (
              <div className="rounded-lg border-l-4 border-brand-gold bg-muted/40 p-4 text-sm">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">How to pay</p>
                <dl className="mt-1 space-y-0.5">
                  {lh.pay.map((r) => (
                    <div key={r.label} className="flex flex-wrap gap-x-2">
                      <dt>{r.label}</dt>
                      <dd className="font-mono font-bold">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {lh.terms && (
              <div className="text-sm">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Terms</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{lh.terms}</p>
              </div>
            )}

            {(lh.signatureUrl || lh.stampUrl) && (
              <div className="flex items-end justify-between gap-6">
                <div className="w-48 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads file, served as is */}
                  {lh.signatureUrl && <img src={lh.signatureUrl} alt="Signature" className="mx-auto mb-1 h-12 object-contain" />}
                  <p className="border-t pt-1 text-xs text-muted-foreground">Authorised signature</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads file, served as is */}
                {lh.stampUrl && <img src={lh.stampUrl} alt="Stamp" className="size-20 object-contain" />}
              </div>
            )}

            {lh.footer && <p className="text-center text-xs text-muted-foreground">{lh.footer}</p>}
          </div>
        </article>
      </div>
    </div>
  );
}
