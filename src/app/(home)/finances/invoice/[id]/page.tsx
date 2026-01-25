import { db } from "@/lib/prisma";
import { ViewInvoiceQuery } from "@/Modules/Finances/Invoices/Types";
import ViewInvoicePage from "@/Modules/Finances/Invoices/ui/ViewInvoice";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;
  const invoice = await db.invoice.findUnique(ViewInvoiceQuery(id));

  if (!invoice) notFound();

  return <ViewInvoicePage data={invoice} />;
};

export default page;
