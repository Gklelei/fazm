"use server";

import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import {
  ExpenseCategorySchema,
  ExpenseCategoryType,
} from "@/features/expenses/schemas";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog, diffFields } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";

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

  if (!hasRole(session.user.role, "finance")) {
    return {
      success: false,
      message:
        "Unauthorized access, You are not allowed to perfome this action",
    };
  }

  const input1 = ExpenseCategorySchema.safeParse(values);
  if (!input1.success) return { success: false, message: actionErrorMessage(input1.error) };
  const { name, status, description } = input1.data;

  try {
    const category = await db.$transaction(async (ctx) => {
      return ctx.expenseCategories.create({
        data: {
          name,
          status,
          description,
        },
      });
    });

    revalidatePath("/expenses-categories");
    lookupsChanged(LOOKUP.expenseCategories);

    await createAuditLog({
      action: "CREATE_EXPENSE_CATEGORY",
      resource: "ExpenseCategory",
      details: `Added expense category "${name}"`,
      userId: session.user.id,
      recordId: category.id,
    });
    return {
      message: "Expense category created",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: actionErrorMessage(error),
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

  if (!hasRole(session.user.role, "finance")) {
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
    lookupsChanged(LOOKUP.expenseCategories);

    await createAuditLog({
      action: "UPDATE_EXPENSE_CATEGORY",
      resource: "ExpenseCategory",
      details: `Set expense category "${existingCategory.name}" to ${status.toLowerCase()}`,
      userId: session.user.id,
      recordId: id,
      changes: diffFields(existingCategory, { status }),
    });
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

  if (!hasRole(session.user.role, "finance")) {
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
    lookupsChanged(LOOKUP.expenseCategories);

    await createAuditLog({
      action: "ARCHIVE_EXPENSE_CATEGORY",
      resource: "ExpenseCategory",
      details: `Archived expense category "${existingCategory.name}"`,
      userId: session.user.id,
      recordId: id,
    });
    return {
      message: "Expense category deleted",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: actionErrorMessage(error),
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

  if (!hasRole(session.user.role, "finance")) {
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
    lookupsChanged(LOOKUP.expenseCategories);

    const after = { name: values.name, description: values.description ?? "", status: values.status };
    await createAuditLog({
      action: "UPDATE_EXPENSE_CATEGORY",
      resource: "ExpenseCategory",
      details: `Updated expense category "${values.name}"`,
      userId: session.user.id,
      recordId: id,
      changes: diffFields(existingCategory, after),
    });
    return { success: true, message: "Expense category updated" };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: actionErrorMessage(error),
    };
  }
}
