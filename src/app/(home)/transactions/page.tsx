import { db } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  FetchAllInvoicesQuery,
  GetAllFinanceAtheletes,
  GetFinancesQuery,
} from "@/Modules/Finances/Type";
import ViewAllFinances from "@/Modules/Finances/Ui/ViewAllFinances";

const PAGE_SIZE = 10;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt((sp.page as string) || "1", 10) || 1);
  const search = ((sp.search as string) || "").trim();
  const from = (sp.from as string) || "";
  const to = (sp.to as string) || "";

  const where: Prisma.FinanceWhereInput = {
    ...GetFinancesQuery.where,
  };

  if (search) {
    where.OR = [
      { athlete: { firstName: { contains: search, mode: "insensitive" } } },
      { athlete: { lastName: { contains: search, mode: "insensitive" } } },
      { athleteId: { contains: search, mode: "insensitive" } },
      { receiptNumber: { contains: search, mode: "insensitive" } },
      {
        invoice: { invoiceNumber: { contains: search, mode: "insensitive" } },
      },
    ];
  }

  if (from || to) {
    const paymentDateFilter: Prisma.DateTimeFilter = {};

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        paymentDateFilter.gte = fromDate;
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        paymentDateFilter.lte = toDate;
      }
    }

    if (Object.keys(paymentDateFilter).length > 0) {
      where.paymentDate = paymentDateFilter;
    }
  }

  const [finances, total, athletes, invoices] = await db.$transaction([
    db.finance.findMany({
      where,
      include: GetFinancesQuery.include,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.finance.count({ where }),
    db.athlete.findMany(GetAllFinanceAtheletes),
    db.invoice.findMany(FetchAllInvoicesQuery),
  ]);

  return (
    <div>
      <ViewAllFinances
        data={JSON.parse(JSON.stringify(finances))}
        athletes={JSON.parse(JSON.stringify(athletes))}
        invoices={JSON.parse(JSON.stringify(invoices))}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        initialSearch={search}
        initialFrom={from}
        initialTo={to}
      />
    </div>
  );
}
