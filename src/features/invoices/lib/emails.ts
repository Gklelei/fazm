import "server-only";
import { subDays } from "date-fns";
import { db } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { getCachedAcademy } from "@/lib/academy-cache";
import { formatCurrency } from "@/lib/format";
import { formatAcademy } from "@/lib/academy-time";
import { invoiceBalance } from "@/features/invoices/lib/status";
import { invoicePdf } from "@/features/invoices/lib/pdf";
import { howToPay } from "@/features/academy/lib/how-to-pay";

/**
 * Emails to guardians, each switched on in Settings → Emails: a new invoice
 * (PDF attached), a payment receipt, and overdue reminders (at most weekly).
 * They never block or fail the action that triggered them.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const day = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The athlete's guardians' addresses (the athlete's own when they're 18 or over). */
export async function guardianEmails(athleteId: string) {
  const rows = await db.athleteGuardian.findMany({ where: { athleteId }, select: { email: true } });
  return [...new Set(rows.map((r) => r.email.trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
}

/** A plain letter: greeting, a few label/value rows, a closing line. */
async function letter(title: string, intro: string, rows: [string, string][], { pay, outro }: { pay?: { athleteId: string; invoiceNumber: string }; outro?: string } = {}) {
  const a = await getCachedAcademy().catch(() => null);
  const name = a?.academyName || "Fazam Football Academy";
  // Payment instructions from Academy profile → How parents pay
  const all: [string, string][] = [...rows, ...(pay ? howToPay(a, pay).map((r): [string, string] => [r.label, r.value]) : [])];
  const text = [intro, "", ...all.map(([k, v]) => `${k}: ${v}`), "", outro ?? "", "", name].join("\n");
  const html = `<div style="font-family:sans-serif;max-width:560px;color:#111">
<h2 style="margin:0 0 12px">${esc(title)}</h2>
<p>${esc(intro)}</p>
<table style="border-collapse:collapse;margin:12px 0">${all
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`)
    .join("")}</table>
${outro ? `<p>${esc(outro)}</p>` : ""}
<p style="color:#888;font-size:12px;margin-top:24px">${esc(name)}</p></div>`;
  return { text, html };
}

const athleteName = (a: { firstName: string; lastName: string }) => `${a.firstName} ${a.lastName}`;

export async function emailInvoice(invoiceNumber: string) {
  if (!(await getSettings()).emailInvoices) return;
  const made = await invoicePdf({ invoiceNumber }, process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
  if (!made) return;
  const { invoice: inv, pdf } = made;
  const to = await guardianEmails(inv.athleteId);
  if (!to.length) return;
  const { text, html } = await letter(
    `Invoice ${inv.invoiceNumber}`,
    `Here is a new invoice for ${athleteName(inv.athlete)}. The PDF is attached.`,
    [
      ["For", inv.description ?? "Fees"],
      ["To pay", formatCurrency(invoiceBalance(inv))],
      ["Due", day(inv.dueDate)],
    ],
    { pay: inv },
  );
  await sendMail({
    to,
    subject: `Invoice ${inv.invoiceNumber} for ${athleteName(inv.athlete)}`,
    text,
    html,
    attachments: [{ filename: `${inv.invoiceNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
  });
}

export async function emailReceipt(receiptNumber: string) {
  if (!(await getSettings()).emailReceipts) return;
  const f = await db.finance.findUnique({
    where: { receiptNumber },
    include: { athlete: { select: { firstName: true, lastName: true } }, invoice: true },
  });
  if (!f) return;
  const to = await guardianEmails(f.athleteId);
  if (!to.length) return;
  const left = f.invoice ? invoiceBalance(f.invoice) : 0;
  const { text, html } = await letter(
    `Receipt ${f.receiptNumber}`,
    `Thank you. We received a payment for ${athleteName(f.athlete)}.`,
    [
      ["Amount paid", formatCurrency(f.amountPaid)],
      ["Paid on", day(f.paymentDate)],
      ...(f.invoice ? ([["For invoice", f.invoice.invoiceNumber], ["Still to pay", formatCurrency(left)]] as [string, string][]) : []),
    ],
  );
  await sendMail({ to, subject: `Receipt ${f.receiptNumber} for ${athleteName(f.athlete)}`, text, html });
}

/** Job: remind guardians of overdue invoices, at most once a week per invoice. */
export async function overdueReminders({ now = new Date(), dryRun = false } = {}) {
  if (!(await getSettings()).emailOverdue) return { sent: 0, reason: "Overdue reminders are off" };
  const due = await db.invoice.findMany({
    where: { status: "OVERDUE", OR: [{ remindedAt: null }, { remindedAt: { lt: subDays(now, 7) } }] },
    include: { athlete: { select: { firstName: true, lastName: true } } },
    take: 200,
  });
  let sent = 0;
  const skipped: string[] = [];
  for (const inv of due) {
    const to = await guardianEmails(inv.athleteId);
    if (!to.length) {
      skipped.push(inv.invoiceNumber);
      continue;
    }
    if (dryRun) {
      sent++;
      continue;
    }
    const { text, html } = await letter(
      `Invoice ${inv.invoiceNumber} is overdue`,
      `The invoice for ${athleteName(inv.athlete)} was due on ${day(inv.dueDate)} and is still open.`,
      [
        ["For", inv.description ?? "Fees"],
        ["Still to pay", formatCurrency(invoiceBalance(inv))],
      ],
      { pay: inv, outro: "Please pay as soon as you can. If you've already paid, thank you, and ignore this email." },
    );
    const res = await sendMail({ to, subject: `Reminder: invoice ${inv.invoiceNumber} is overdue`, text, html });
    if (res.success) {
      await db.invoice.update({ where: { id: inv.id }, data: { remindedAt: now } });
      sent++;
    }
  }
  return { sent, checked: due.length, noEmail: skipped.length, ...(dryRun && { dryRun: true }) };
}
