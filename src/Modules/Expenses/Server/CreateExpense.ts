"use server";

import {
  CreateExpenseSchema,
  ServerCreateExpenseType,
} from "../Validators/CreateExpense";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { headers } from "next/headers";

export async function CreateExpense(
  data: ServerCreateExpenseType,
): Promise<ActionResult> {
  const parsedData = CreateExpenseSchema.parse(data);

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
    await db.expenses.create({
      data: {
        name: parsedData.name,
        amount: parsedData.amount,
        date: parsedData.date,
        description: parsedData.description,
        categoryId: parsedData.category,
      },
    });

    revalidatePath("/expenses");

    await createAuditLog({
      action: "CREATE_EXPENSE",
      resource: "Expense",
      details: `Logged expense of ${parsedData.amount} for ${parsedData.name}`,
      userId: session.user.id,
    });

    return {
      message: "Expense created",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

export const VoidExpenses = async (id: string): Promise<ActionResult> => {
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
    const exitingExpense = await db.expenses.findUnique({
      where: {
        id,
      },
    });

    if (!exitingExpense) {
      return {
        message: "Expense does not exist",
        success: false,
      };
    }
    await db.expenses.update({
      where: {
        id,
      },
      data: {
        isArchived: true,
      },
    });

    revalidatePath("/expenses");

    await createAuditLog({
      action: "VOID_EXPENSE",
      resource: "Expense",
      details: `Voided expense ${id}`,
      userId: session.user.id,
    });

    return {
      success: true,
      message: "Expense seleted",
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};

export async function EditExpense(
  data: ServerCreateExpenseType,
  id: string,
): Promise<ActionResult> {
  const parsedData = CreateExpenseSchema.parse(data);

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
    const exitingExpense = await db.expenses.findUnique({
      where: {
        id,
      },
    });

    if (!exitingExpense) {
      return {
        message: "Expense does not exist",
        success: false,
      };
    }
    await db.expenses.update({
      where: {
        id,
      },
      data: {
        name: parsedData.name,
        amount: parsedData.amount,
        date: parsedData.date,
        description: parsedData.description,
        categoryId: parsedData.category,
      },
    });

    revalidatePath("/expenses");

    await createAuditLog({
      action: "UPDATE_EXPENSE",
      resource: "Expense",
      details: `Updated details for expense ${id} - amount ${parsedData.amount}`,
      userId: session.user.id,
    });

    return {
      message: "Expense created",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}
