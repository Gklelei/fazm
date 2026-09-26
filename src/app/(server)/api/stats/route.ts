import { db } from "@/lib/prisma";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";

// Validation helpers
const parsePositiveInt = (
  value: string | null,
  defaultValue: number,
): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : defaultValue;
};

const VALID_PERIODS = ["W", "M", "Y"] as const;
const VALID_SORT_FIELDS = ["createdAt", "amount"] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;

function isOneOf<T extends string>(
  allowed: readonly T[],
  value: string,
): value is T {
  return (allowed as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const authz = await checkRole(["SUPER_ADMIN", "ADMIN"]);
    if (!authz.ok) {
      return apiError(AUTHZ_HTTP_STATUS[authz.reason], "Unauthorized");
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period");
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Validate inputs
    if (period && !isOneOf(VALID_PERIODS, period)) {
      return apiError(
        400,
        `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}`,
      );
    }

    if (!isOneOf(VALID_SORT_FIELDS, sortBy)) {
      return apiError(
        400,
        `Invalid sortBy. Must be one of: ${VALID_SORT_FIELDS.join(", ")}`,
      );
    }

    if (!isOneOf(VALID_SORT_ORDERS, sortOrder)) {
      return apiError(
        400,
        `Invalid sortOrder. Must be one of: ${VALID_SORT_ORDERS.join(", ")}`,
      );
    }

    if (limit > 100) {
      return apiError(400, "Limit cannot exceed 100");
    }

    // Calculate date range
    const now = new Date();
    let dateRange = undefined;

    if (period === "W") {
      dateRange = {
        gte: startOfWeek(now, { weekStartsOn: 1 }),
        lte: endOfWeek(now, { weekStartsOn: 1 }),
      };
    } else if (period === "M") {
      dateRange = {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      };
    } else if (period === "Y") {
      dateRange = {
        gte: startOfYear(now),
        lte: endOfYear(now),
      };
    }

    // Pagination calculations
    const skip = (page - 1) * limit;

    // Fetch data with pagination
    const [
      transactions,
      transactionsCount,
      dueInvoices,
      dueInvoicesCount,
      totalDue,
    ] = await Promise.all([
      // Paginated transactions
      db.finance.findMany({
        where: {
          createdAt: dateRange,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),

      // Total transactions count
      db.finance.count({
        where: {
          createdAt: dateRange,
        },
      }),

      // Paginated due invoices
      db.invoice.findMany({
        where: {
          status: {
            notIn: ["PAID"],
          },
          dueDate: {
            lt: now,
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        skip,
        take: limit,
      }),

      // Total due invoices count
      db.invoice.count({
        where: {
          status: {
            notIn: ["PAID"],
          },
          dueDate: {
            lt: now,
          },
        },
      }),

      // Total amount due aggregate
      db.invoice.aggregate({
        _sum: {
          amountDue: true,
        },
        where: {
          status: {
            notIn: ["PAID"],
          },
          dueDate: {
            lte: now,
          },
        },
      }),
    ]);

    // Calculate pagination metadata
    const transactionsMeta = {
      currentPage: page,
      pageSize: limit,
      totalItems: transactionsCount,
      totalPages: Math.ceil(transactionsCount / limit),
      hasNextPage: page < Math.ceil(transactionsCount / limit),
      hasPreviousPage: page > 1,
    };

    const invoicesMeta = {
      currentPage: page,
      pageSize: limit,
      totalItems: dueInvoicesCount,
      totalPages: Math.ceil(dueInvoicesCount / limit),
      hasNextPage: page < Math.ceil(dueInvoicesCount / limit),
      hasPreviousPage: page > 1,
    };

    const data = {
      transactions: {
        data: transactions,
        meta: transactionsMeta,
      },
      dueInvoices: {
        data: dueInvoices,
        meta: invoicesMeta,
      },
      summary: {
        totalDueAmount: totalDue._sum.amountDue || 0,
        totalDueInvoices: dueInvoicesCount,
        period: period || "all",
      },
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error("Error in GET /api/finance:", e);
    return apiError(500, "Internal server error");
  }
}
