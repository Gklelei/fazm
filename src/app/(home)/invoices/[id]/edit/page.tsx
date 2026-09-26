import { db } from "@/lib/prisma";
import { EditInvoiceQuery } from "@/Modules/Finances/Invoices/Types";
import EditInvoice from "@/Modules/Finances/Invoices/ui/EditInvoice";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Invoice" };

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;

  const invoice = await db.invoice.findUnique(EditInvoiceQuery(id));

  if (!invoice) return notFound();

  const safeInvoice = JSON.parse(JSON.stringify(invoice));

  return <EditInvoice data={safeInvoice as any} />;
};

export default page;
