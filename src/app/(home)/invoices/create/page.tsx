import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { academyDate } from "@/lib/academy-time";
import { InvoiceForm } from "@/features/invoices/components/InvoiceForm";

export const metadata: Metadata = { title: "New invoice" };

/** Due a week from today unless changed. */
const inAWeek = () => academyDate(new Date(Date.now() + 7 * 86_400_000));

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New invoice" />
      <InvoiceForm defaultDue={inAWeek()} />
    </div>
  );
}
