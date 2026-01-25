"use server";

import { auth } from "@/lib/auth";
import { ExpenseCategorySchema, ExpenseCategoryType } from "../Validators";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const CreateExpenseCategoryAction = async (
  values: ExpenseCategoryType,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access, please login",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message:
        "Unauthorized access, You are not allowed to perfome this action",
    };
  }

  const { name, status, description } = ExpenseCategorySchema.parse(values);

  try {
    await db.$transaction(async (ctx) => {
      await ctx.expenseCategories.create({
        data: {
          name,
          status,
          description,
        },
      });
    });
    revalidatePath("/expenses");
    revalidatePath("/expenses-categories");
    return {
      message: "Expense category created",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};

export const UpdateExpenseCategoryStatus = async ({
  id,
  status,
}: {
  id: string;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access, please login",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message:
        "Unauthorized access, You are not allowed to perfome this action",
    };
  }

  try {
    return {
      success: true,
      message: "",
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: "internal server error",
    };
  }
};
