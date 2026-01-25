import { Prisma } from "@/generated/prisma/client";

export const GetExpenseCategoriesQuery =
  {} satisfies Prisma.ExpenseCategoriesFindFirstArgs;

export type GetExpenseCategoriesQuery = Prisma.ExpenseCategoriesGetPayload<
  typeof GetExpenseCategoriesQuery
>;
