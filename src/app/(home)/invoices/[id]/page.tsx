import { db } from "@/lib/prisma";
import { ViewInvoiceQuery } from "@/features/invoices/queries";
import ViewInvoicePage from "@/features/invoices/components/ViewInvoice";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { logView } from "@/lib/audit-view";

export const metadata: Metadata = { title: "Invoice Details" };

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;
  const invoice = await db.invoice.findUnique(ViewInvoiceQuery(id));

  if (!invoice) notFound();
  await logView({
    resource: "Invoice",
    recordId: invoice.id,
    invoiceId: invoice.id,
    details: `Opened invoice ${invoice.invoiceNumber}`,
  });

  const safeInvoice = JSON.parse(JSON.stringify(invoice));

  return <ViewInvoicePage data={safeInvoice} />;
};

export default page;
