import { db } from "@/lib/prisma";
import { GetExpenseCategoriesQuery } from "@/Modules/Expenses/Types";
import ExpenseCategories from "@/Modules/Expenses/ui/ExpenseCategories";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [categories, total] = await db.$transaction([
    db.expenseCategories.findMany({
      ...GetExpenseCategoriesQuery,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.expenseCategories.count(),
  ]);

  return (
    <ExpenseCategories
      data={categories}
      page={page}
      limit={limit}
      total={total}
    />
  );
}
