import type { Metadata } from "next";
import InvoicesBoard from "@/features/invoices/components/InvoicesBoard";
import { listInvoices } from "@/features/invoices/queries/list";

export const metadata: Metadata = { title: "Invoices" };

export default async function Page() {
  const firstPage = await listInvoices({});
  return <InvoicesBoard initialData={{ pages: [firstPage], pageParams: [""] }} />;
}
