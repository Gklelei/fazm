import { db } from "@/lib/prisma";
import { GetExpensesQuery } from "@/features/expenses/queries";
import ExpensesPage from "@/features/expenses/components/ExpensesPage";
import type { Metadata } from "next";
import { inProgramme, selectedProgrammeId } from "@/lib/programme";

export const metadata: Metadata = { title: "Expenses" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  // The header's programme: its own expenses (shared ones show under all programmes)
  const where = { ...GetExpensesQuery.where, ...inProgramme.expense(await selectedProgrammeId()) };
  const [expensesResponse, total] = await db.$transaction([
    db.expenses.findMany({
      ...GetExpensesQuery,
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    db.expenses.count({ where }),
  ]);

  const expenses = expensesResponse;

  return (
    <ExpensesPage expenses={expenses} page={page} limit={limit} total={total} />
  );
}
