import { db } from "@/lib/prisma";
import { GetExpensesQuery } from "@/Modules/Expenses/Types";
import ExpensesPage from "@/Modules/Expenses/ui/ExpensesPage";

const page = async () => {
  const expenses = await db.expenses.findMany(GetExpensesQuery);
  return <ExpensesPage expenses={expenses} />;
};

export default page;
