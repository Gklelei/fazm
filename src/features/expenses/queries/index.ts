import { Prisma } from "@/generated/prisma/client";

export const GetExpenseCategoriesQuery = {
  where: {
    isArchived: false,
  },
  include: {
    expenses: true,
  },
} satisfies Prisma.ExpenseCategoriesFindFirstArgs;

export type GetExpenseCategoriesQuery = Prisma.ExpenseCategoriesGetPayload<
  typeof GetExpenseCategoriesQuery
>;

export const GetExpensesQuery = {
  where: {
    isArchived: false,
  },
  include: {
    category: true,
  },
} satisfies Prisma.ExpensesFindManyArgs;

export type GetExpensesQueryType = Prisma.ExpensesGetPayload<
  typeof GetExpensesQuery
>;
