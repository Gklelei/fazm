import { db } from "@/lib/prisma";
import {
  FetchAllInvoicesQuery,
  GetAllFinanceAtheletes,
  GetFinancesQuery,
} from "@/Modules/Finances/Type";
import ViewAllFinances from "@/Modules/Finances/Ui/ViewAllFinances";

const Page = async () => {
  // const pageSize = 10;
  const [finances, athletes, invoices] = await Promise.all([
    db.finance.findMany({
      ...GetFinancesQuery,
      // take: pageSize,
      // orderBy: [{ createdAt: "desc", id: "desc" }],
    }),
    db.athlete.findMany(GetAllFinanceAtheletes),
    db.invoice.findMany(FetchAllInvoicesQuery),
  ]);

  return (
    <div>
      <ViewAllFinances
        data={finances}
        athletes={athletes}
        invoices={invoices}
      />
    </div>
  );
};

export default Page;
