import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { GetExpensesQuery } from "@/Modules/Expenses/Types";
import { GetExpenseCategoriesQuery } from "@/Modules/Expenses/Types";
import { GetCouponsQuery } from "@/Modules/Coupons/Types/Index";
import { GetStaffQuery } from "@/Modules/Users/stafff/types";
import { GetAllTrainingSessionsQuery } from "@/Modules/Trainings/Assesments/Types";

export const dynamic = "force-dynamic";

/**
 * GET /api/export?resource=expenses|expense-categories|coupons|staff|sessions|athletes|invoices
 *
 * Returns ALL rows (no pagination) so the client can export everything.
 */
export async function GET(req: NextRequest) {
  const resource = req.nextUrl.searchParams.get("resource");

  try {
    switch (resource) {
      case "expenses": {
        const data = await db.expenses.findMany({
          ...(GetExpensesQuery as any),
          orderBy: { date: "desc" },
        });
        return NextResponse.json(data);
      }

      case "expense-categories": {
        const data = await db.expenseCategories.findMany({
          ...GetExpenseCategoriesQuery,
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(data);
      }

      case "coupons": {
        const data = await db.coupon.findMany({
          ...GetCouponsQuery,
          where: { status: 1, voided: 0 },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(data);
      }

      case "staff": {
        const data = await db.staff.findMany({
          ...GetStaffQuery,
          orderBy: { createAt: "desc" },
        });
        return NextResponse.json(data);
      }

      case "sessions": {
        const data = await db.training.findMany({
          ...GetAllTrainingSessionsQuery,
          where: { isArchived: false },
          orderBy: { date: "desc" },
        });
        return NextResponse.json(data);
      }

      case "athletes": {
        const data = await db.athlete.findMany({
          where: { isArchived: false },
          select: {
            athleteId: true,
            firstName: true,
            middleName: true,
            lastName: true,
            age: true,
            email: true,
            positions: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(data);
      }

      case "invoices": {
        const data = await db.invoice.findMany({
          include: {
            athlete: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            subscriptionPlan: {
              select: { code: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: `Unknown resource: ${resource}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[EXPORT API]", error);
    return NextResponse.json(
      { error: "Failed to fetch data for export" },
      { status: 500 },
    );
  }
}
