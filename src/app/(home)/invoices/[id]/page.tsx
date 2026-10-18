import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { logView } from "@/lib/audit-view";
import { howToPay } from "@/features/academy/lib/how-to-pay";
import { getCachedAcademy } from "@/lib/academy-cache";
import ViewInvoice, { INVOICE_PAGE_INCLUDE } from "@/features/invoices/components/ViewInvoice";

export const metadata: Metadata = { title: "Invoice" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Links use the invoice number; older links and the activity log use the id
  const invoice = await db.invoice.findFirst({ where: { OR: [{ invoiceNumber: id }, { id }] }, include: INVOICE_PAGE_INCLUDE });
  if (!invoice) notFound();
  await logView({ resource: "Invoice", recordId: invoice.id, invoiceId: invoice.id, details: `Opened invoice ${invoice.invoiceNumber}` });
  // Older invoices stored the issuer's email; show their name when they're a user
  const issuer = invoice.issuedBy ? await db.user.findUnique({ where: { email: invoice.issuedBy }, select: { name: true } }) : null;
  const a = await getCachedAcademy().catch(() => null);
  return (
    <ViewInvoice
      data={invoice}
      issuer={issuer?.name ?? invoice.issuedBy ?? "System"}
      letterhead={{
        academyName: a?.academyName || "Fazam Football Academy",
        address: a?.address ?? null,
        contactEmail: a?.contactEmail ?? null,
        contactPhone: a?.contactPhone ?? null,
        logoUrl: a?.logoUrl ?? null,
        pay: howToPay(a, invoice),
        footer: a?.receiptFooterNotes ?? null,
        kraPin: a?.kraPin ?? null,
        terms: a?.documentTerms ?? null,
      }}
    />
  );
}
