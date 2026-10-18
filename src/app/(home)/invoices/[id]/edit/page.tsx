import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { academyDate } from "@/lib/academy-time";
import { athleteName } from "@/features/athletes/lib/names";
import { InvoiceForm } from "@/features/invoices/components/InvoiceForm";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await db.invoice.findFirst({
    where: { OR: [{ invoiceNumber: id }, { id }] },
    include: { lines: { orderBy: { position: "asc" } }, athlete: { select: { firstName: true, middleName: true, lastName: true } } },
  });
  if (!inv) notFound();
  if (inv.status === "CANCELED") redirect(`/invoices/${inv.invoiceNumber}`);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={`Edit ${inv.invoiceNumber}`} description={athleteName(inv.athlete)} />
      <InvoiceForm
        invoiceNumber={inv.invoiceNumber}
        defaultDue={academyDate(inv.dueDate)}
        values={{
          type: inv.type,
          dueDate: academyDate(inv.dueDate),
          notes: inv.notes ?? "",
          lines: inv.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitAmount: Number(l.unitAmount),
            subscriptionPlanId: l.subscriptionPlanId ?? undefined,
          })),
        }}
      />
    </div>
  );
}
