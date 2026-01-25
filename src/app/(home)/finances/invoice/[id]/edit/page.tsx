import { db } from "@/lib/prisma";
import { EditInvoiceQuery } from "@/Modules/Finances/Invoices/Types";
import EditInvoice from "@/Modules/Finances/Invoices/ui/EditInvoice";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;

  const invoice = await db.invoice.findUnique(EditInvoiceQuery(id));

  if (!invoice) return notFound();
  return <EditInvoice data={invoice} />;
};

export default page;
