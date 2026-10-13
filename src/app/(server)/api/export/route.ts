import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { GetExpensesQuery } from "@/features/expenses/queries";
import { GetExpenseCategoriesQuery } from "@/features/expenses/queries";
import { GetCouponsQuery } from "@/features/coupons/queries";
import { GetStaffQuery } from "@/features/staff/queries";
import { GetAllTrainingSessionsQuery } from "@/features/assessments/queries";
import { Prisma } from "@/generated/prisma/client";
import { apiError } from "@/lib/api-response";
import { hasRole, type RoleGroup } from "@/lib/roles";
import {
  athleteFiltersFromParams,
  buildAthleteWhere,
} from "@/features/athletes/queries/filters";

export const dynamic = "force-dynamic";

const EXPORT_ACCESS: Record<string, RoleGroup> = {
  expenses: "finance",
  "expense-categories": "finance",
  coupons: "finance",
  invoices: "finance",
  finance: "finance",
  staff: "admin",
  sessions: "coaching",
  athletes: "coaching",
};

/** Maximum rows returned from any export to prevent OOM / timeout */
const MAX_EXPORT_ROWS = 5_000;

/**
 * GET /api/export?resource=expenses|expense-categories|coupons|staff|sessions|athletes|invoices|finance
 *
 * Returns ALL rows (no pagination) so the client can export everything.
 */
export async function GET(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return apiError(401, "Unauthorized");
  }

  const resource = req.nextUrl.searchParams.get("resource");

  // Same groups that may open the page the export button sits on
  const group = resource ? EXPORT_ACCESS[resource] : undefined;
  if (!group) return apiError(400, "Unknown resource");
  if (!hasRole(session.user.role, group)) return apiError(403, "Forbidden");
  const query = req.nextUrl.searchParams.get("query")?.trim() || "";

  try {
    switch (resource) {
      case "expenses": {
        const whereClause: Prisma.ExpensesWhereInput = {};
        if (query) {
          whereClause.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { category: { name: { contains: query, mode: "insensitive" } } },
            { description: { contains: query, mode: "insensitive" } },
          ];
        }

        const data = await db.expenses.findMany({
          ...GetExpensesQuery,
          where: whereClause,
          orderBy: { date: "desc" },
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "expense-categories": {
        const whereClause: Prisma.ExpenseCategoriesWhereInput = {};
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
        const whereClause: Prisma.CouponWhereInput = { status: 1, voided: 0 };
        if (query) {
          whereClause.name = { contains: query, mode: "insensitive" };
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
        const whereClause: Prisma.staffWhereInput = {};
        if (query) {
          whereClause.OR = [
            { fullNames: { contains: query, mode: "insensitive" } },
            { staffId: { contains: query, mode: "insensitive" } },
            { phoneNumber: { contains: query, mode: "insensitive" } },
            { user: { email: { contains: query, mode: "insensitive" } } },
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
        const whereClause: Prisma.trainingWhereInput = { isArchived: false };
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
        const data = await db.athlete.findMany({
          where: buildAthleteWhere(
            athleteFiltersFromParams(req.nextUrl.searchParams),
          ),
          select: {
            athleteId: true,
            firstName: true,
            middleName: true,
            lastName: true,
            age: true,
            email: true,
            phoneNumber: true,
            positions: true,
            status: true,
            createdAt: true,
            batches: { select: { name: true } },
          },
          // Grouped by batch, then alphabetical — prints as a batch roster
          orderBy: [
            { batches: { name: "asc" } },
            { firstName: "asc" },
            { lastName: "asc" },
          ],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "invoices": {
        const whereClause: Prisma.InvoiceWhereInput = {};

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

      case "finance": {
        const whereClause: Prisma.FinanceWhereInput = { isArchived: false };

        // ── Date range filter (on paymentDate) ─────────────────────────
        const fromDate = req.nextUrl.searchParams.get("from");
        const toDate = req.nextUrl.searchParams.get("to");

        if (fromDate || toDate) {
          const paymentDateFilter: { gte?: Date; lte?: Date } = {};

          if (fromDate) {
            const from = new Date(fromDate);
            if (!isNaN(from.getTime())) {
              paymentDateFilter.gte = from;
            }
          }

          if (toDate) {
            const to = new Date(toDate);
            if (!isNaN(to.getTime())) {
              to.setHours(23, 59, 59, 999);
              paymentDateFilter.lte = to;
            }
          }

          if (Object.keys(paymentDateFilter).length > 0) {
            whereClause.paymentDate = paymentDateFilter;
          }
        }

        // ── Search query filter ────────────────────────────────────────
        if (query) {
          whereClause.OR = [
            { receiptNumber: { contains: query, mode: "insensitive" } },
            { athleteId: { contains: query, mode: "insensitive" } },
            {
              athlete: { firstName: { contains: query, mode: "insensitive" } },
            },
            { athlete: { lastName: { contains: query, mode: "insensitive" } } },
            {
              invoice: {
                invoiceNumber: { contains: query, mode: "insensitive" },
              },
            },
          ];
        }

        const data = await db.finance.findMany({
          where: whereClause,
          include: {
            athlete: {
              select: {
                firstName: true,
                lastName: true,
                profilePIcture: true,
              },
            },
            invoice: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      default:
        return apiError(400, `Unknown resource: ${resource}`);
    }
  } catch (error) {
    console.error("[EXPORT API]", error);
    return apiError(500, "Failed to fetch data for export");
  }
}
