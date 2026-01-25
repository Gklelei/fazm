import { db } from "@/lib/prisma";
import {
  FetchAllInvoicesQuery,
  GetAllFinanceAtheletes,
  GetFinancesQuery,
} from "@/Modules/Finances/Type";
import ViewAllFinances from "@/Modules/Finances/Ui/ViewAllFinances";

const Page = async () => {
  const [finances, athletes, invoices] = await Promise.all([
    db.finance.findMany(GetFinancesQuery),
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
