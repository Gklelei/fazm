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
    const existingCategory = await db.expenseCategories.findUnique({
      where: {
        id,
      },
    });

    if (!existingCategory) {
      return {
        success: false,
        message: "Expense category does not exist",
      };
    }
    await db.expenseCategories.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    revalidatePath("/expenses-categories");

    return {
      success: true,
      message: "Expense category updated",
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: "internal server error",
    };
  }
};

export const DeleteExpenseCategory = async ({
  id,
}: {
  id: string;
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
    const existingCategory = await db.expenseCategories.findUnique({
      where: {
        id,
      },
    });
    if (!existingCategory) {
      return {
        success: false,
        message: "Expense category does not exist",
      };
    }

    await db.expenseCategories.update({
      where: {
        id,
      },
      data: {
        isArchived: true,
      },
    });

    revalidatePath("/expenses-categories");

    return {
      message: "Expense category deleted",
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

export async function EditExpenseCategory(
  values: ExpenseCategoryType,
  id: string,
): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, message: "Unauthorized access, please login" };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message:
        "Unauthorized access, You are not allowed to perfome this action",
    };
  }

  try {
    const existingCategory = await db.expenseCategories.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return { success: false, message: "Expense category does not exist" };
    }

    await db.expenseCategories.update({
      where: { id },
      data: {
        name: values.name,
        description: values.description ?? "",
        status: values.status,
      },
    });

    revalidatePath("/expenses-categories");

    return { success: true, message: "Expense category updated" };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}
