import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { GetExpensesQuery } from "@/Modules/Expenses/Types";
import { GetExpenseCategoriesQuery } from "@/Modules/Expenses/Types";
import { GetCouponsQuery } from "@/Modules/Coupons/Types/Index";
import { GetStaffQuery } from "@/Modules/Users/stafff/types";
import { GetAllTrainingSessionsQuery } from "@/Modules/Trainings/Assesments/Types";

export const dynamic = "force-dynamic";

/** Maximum rows returned from any export to prevent OOM / timeout */
const MAX_EXPORT_ROWS = 5_000;

/**
 * GET /api/export?resource=expenses|expense-categories|coupons|staff|sessions|athletes|invoices
 *
 * Returns ALL rows (no pagination) so the client can export everything.
 */
export async function GET(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resource = req.nextUrl.searchParams.get("resource");
  const query = req.nextUrl.searchParams.get("query")?.trim() || "";

  try {
    switch (resource) {
      case "expenses": {
        const whereClause: any = {};
        if (query) {
          whereClause.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { category: { name: { contains: query, mode: "insensitive" } } },
            { description: { contains: query, mode: "insensitive" } },
          ];
        }

        const data = await db.expenses.findMany({
          ...(GetExpensesQuery as any),
          where: whereClause,
          orderBy: { date: "desc" },
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "expense-categories": {
        const whereClause: any = {};
        if (query) {
          whereClause.name = { contains: query, mode: "insensitive" };
        }

        const data = await db.expenseCategories.findMany({
          ...GetExpenseCategoriesQuery,
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "coupons": {
        const whereClause: any = { status: 1, voided: 0 };
        if (query) {
          whereClause.OR = [
            { code: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            {
              athlete: { firstName: { contains: query, mode: "insensitive" } },
            },
            { athlete: { lastName: { contains: query, mode: "insensitive" } } },
          ];
        }

        const data = await db.coupon.findMany({
          ...GetCouponsQuery,
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "staff": {
        const whereClause: any = {};
        if (query) {
          whereClause.OR = [
            { fullNames: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phoneNumber: { contains: query, mode: "insensitive" } },
            { idNumber: { contains: query, mode: "insensitive" } },
          ];
        }

        const data = await db.staff.findMany({
          ...GetStaffQuery,
          where: whereClause,
          orderBy: { createAt: "desc" },
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "sessions": {
        const whereClause: any = { isArchived: false };
        if (query) {
          whereClause.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { batch: { name: { contains: query, mode: "insensitive" } } },
            { location: { name: { contains: query, mode: "insensitive" } } },
          ];
        }

        const data = await db.training.findMany({
          ...GetAllTrainingSessionsQuery,
          where: whereClause,
          orderBy: { date: "desc" },
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "athletes": {
        const whereClause: any = { isArchived: false };
        if (query) {
          whereClause.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { middleName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { athleteId: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ];
        }

        const data = await db.athlete.findMany({
          where: whereClause,
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
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "invoices": {
        const whereClause: any = {};

        // ── Date range filter ──────────────────────────────────────────
        const fromDate = req.nextUrl.searchParams.get("from");
        const toDate = req.nextUrl.searchParams.get("to");

        if (fromDate || toDate) {
          const createdAtFilter: { gte?: Date; lte?: Date } = {};

          if (fromDate) {
            const from = new Date(fromDate);
            if (!isNaN(from.getTime())) {
              createdAtFilter.gte = from;
            }
          }

          if (toDate) {
            const to = new Date(toDate);
            if (!isNaN(to.getTime())) {
              // Set to end of day (23:59:59.999) to include the entire day
              to.setHours(23, 59, 59, 999);
              createdAtFilter.lte = to;
            }
          }

          if (Object.keys(createdAtFilter).length > 0) {
            whereClause.createdAt = createdAtFilter;
          }
        }

        // ── Search query filter ────────────────────────────────────────
        if (query) {
          whereClause.OR = [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { athleteId: { contains: query, mode: "insensitive" } },
            {
              athlete: { firstName: { contains: query, mode: "insensitive" } },
            },
            { athlete: { lastName: { contains: query, mode: "insensitive" } } },
            { description: { contains: query, mode: "insensitive" } },
          ];
        }

        const data = await db.invoice.findMany({
          where: whereClause,
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
          take: MAX_EXPORT_ROWS,
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
