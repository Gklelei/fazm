import { db } from "@/lib/prisma";
import Invoices from "@/Modules/Finances/Invoices/ui/Invoices";

export default async function Page() {
  const pageSize = 10;

  const items = await db.invoice.findMany({
    take: pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      athlete: {
        select: {
          athleteId: true,
          firstName: true,
          lastName: true,
          middleName: true,
        },
      },
      subscriptionPlan: { select: { name: true, code: true } },
    },
  });

  const last = items[items.length - 1];
  const nextCursor =
    items.length === pageSize && last
      ? JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null;

  const initialData = {
    pages: [{ items: JSON.parse(JSON.stringify(items)), nextCursor }],
    pageParams: [null],
  };

  return <Invoices initialData={initialData} />;
}
