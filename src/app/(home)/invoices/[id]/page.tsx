import { db } from "@/lib/prisma";
import { ViewInvoiceQuery } from "@/Modules/Finances/Invoices/Types";
import ViewInvoicePage from "@/Modules/Finances/Invoices/ui/ViewInvoice";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoice Details" };

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;
  const invoice = await db.invoice.findUnique(ViewInvoiceQuery(id));

  if (!invoice) notFound();

  const safeInvoice = JSON.parse(JSON.stringify(invoice));

  return <ViewInvoicePage data={safeInvoice as any} />;
};

export default page;
