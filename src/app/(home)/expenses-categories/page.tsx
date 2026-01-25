import { db } from "@/lib/prisma";
import { GetExpenseCategoriesQuery } from "@/Modules/Expenses/Types";
import ExpenseCategories from "@/Modules/Expenses/ui/ExpenseCategories";

const page = async () => {
  const categories = await db.expenseCategories.findMany(
    GetExpenseCategoriesQuery,
  );
  return <ExpenseCategories data={categories} />;
};

export default page;
