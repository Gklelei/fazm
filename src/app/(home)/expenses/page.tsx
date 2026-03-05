import { db } from "@/lib/prisma";
import { GetExpensesQuery } from "@/Modules/Expenses/Types";
import ExpensesPage from "@/Modules/Expenses/ui/ExpensesPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [expensesResponse, total] = await db.$transaction([
    db.expenses.findMany({
      ...(GetExpensesQuery as any),
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    db.expenses.count(),
  ]);

  const expenses = expensesResponse as any;

  return (
    <ExpensesPage expenses={expenses} page={page} limit={limit} total={total} />
  );
}
