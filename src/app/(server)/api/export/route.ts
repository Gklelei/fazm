import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { GetExpensesQuery } from "@/features/expenses/queries";
import { GetExpenseCategoriesQuery } from "@/features/expenses/queries";
import { buildCouponWhere, COUPON_LIST_SELECT, couponFiltersFromParams, toCouponRow } from "@/features/coupons/queries/list";
import { GetAllTrainingSessionsQuery } from "@/features/assessments/queries";
import { Prisma } from "@/generated/prisma/client";
import { apiError } from "@/lib/api-response";
import { hasRole, type RoleGroup } from "@/lib/roles";
import {
  buildInvoiceWhere,
  INVOICE_LIST_SELECT,
  invoiceFiltersFromParams,
} from "@/features/invoices/queries/list";
import {
  athleteFiltersFromParams,
  athleteIdMatch,
  buildAthleteWhere,
} from "@/features/athletes/queries/filters";
import { buildStaffWhere, STAFF_LIST_SELECT, staffFiltersFromParams } from "@/features/staff/queries/list";
import { ACTIVITY_SELECT, activityFiltersFromParams, buildActivityWhere } from "@/features/audit-logs/queries/list";
import { inProgramme, selectedProgrammeId } from "@/lib/programme";
import { buildGuardianWhere, guardianFiltersFromParams, GuardiansQuery } from "@/features/guardians/queries";

export const dynamic = "force-dynamic";

const EXPORT_ACCESS: Record<string, RoleGroup> = {
  expenses: "finance",
  "expense-categories": "finance",
  coupons: "finance",
  staff: "admin",
  invoices: "finance",
  finance: "finance",
  sessions: "coaching",
  athletes: "coaching",
  guardians: "admin",
  activity: "developer",
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
  // Exports follow the header's programme, like the list they sit on
  const programmeId = await selectedProgrammeId();

  try {
    switch (resource) {
      case "expenses": {
        const whereClause: Prisma.ExpensesWhereInput = { ...inProgramme.expense(programmeId) };
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
        const rows = await db.coupon.findMany({
          where: await buildCouponWhere(couponFiltersFromParams(req.nextUrl.searchParams)),
          select: COUPON_LIST_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(rows.map(toCouponRow));
      }

      case "sessions": {
        const whereClause: Prisma.trainingWhereInput = {
          isArchived: false,
          ...inProgramme.session(programmeId),
          // Coaches export only the sessions they run, as on the list
          ...(session.user.role === "COACH"
            ? { coach: { userId: session.user.id } }
            : {}),
        };
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

      case "staff": {
        // The list's columns only: no pay or statutory details
        const data = await db.staff.findMany({
          where: buildStaffWhere(staffFiltersFromParams(req.nextUrl.searchParams)),
          select: STAFF_LIST_SELECT,
          orderBy: [{ fullNames: "asc" }, { id: "asc" }],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "athletes": {
        const data = await db.athlete.findMany({
          where: buildAthleteWhere({
            ...athleteFiltersFromParams(req.nextUrl.searchParams),
            programmeId,
          }),
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
            // The phone shown on the roster: the first guardian's
            guardians: { select: { phoneNumber: true }, take: 1 },
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

      case "guardians": {
        const data = await db.athleteGuardian.findMany({
          ...GuardiansQuery,
          where: buildGuardianWhere({
            ...guardianFiltersFromParams((k) => req.nextUrl.searchParams.get(k)),
            programmeId,
          }),
          orderBy: [{ fullNames: "asc" }, { id: "asc" }],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "activity": {
        const items = await db.auditLog.findMany({
          where: buildActivityWhere(activityFiltersFromParams((k) => req.nextUrl.searchParams.get(k))),
          select: ACTIVITY_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(items);
      }

      case "invoices": {
        const data = await db.invoice.findMany({
          where: buildInvoiceWhere({ ...invoiceFiltersFromParams(req.nextUrl.searchParams), programmeId }),
          select: INVOICE_LIST_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: MAX_EXPORT_ROWS,
        });
        return NextResponse.json(data);
      }

      case "finance": {
        const whereClause: Prisma.FinanceWhereInput = { isArchived: false, ...inProgramme.payment(programmeId) };

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
            { athlete: { OR: athleteIdMatch(query) } },
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
