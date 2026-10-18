import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { academyDate } from "@/lib/academy-time";
import { getSettings } from "@/lib/settings";
import { InvoiceForm } from "@/features/invoices/components/InvoiceForm";

export const metadata: Metadata = { title: "New invoice" };

/** Today plus the due days from Settings → Invoices and receipts. */
const dueIn = (days: number) => academyDate(new Date(Date.now() + days * 86_400_000));

export default async function Page() {
  const { invoiceDueDays } = await getSettings();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="New invoice" />
      <InvoiceForm defaultDue={dueIn(invoiceDueDays)} />
    </div>
  );
}
