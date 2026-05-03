import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const allowedRoles = ["SUPER-ADMIN", "ADMIN"];
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!allowedRoles.includes(session?.user.role ?? "")) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period");
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Validate inputs
    if (period && !VALID_PERIODS.includes(period as any)) {
      return NextResponse.json(
        {
          message: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!VALID_SORT_FIELDS.includes(sortBy as any)) {
      return NextResponse.json(
        {
          message: `Invalid sortBy. Must be one of: ${VALID_SORT_FIELDS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!VALID_SORT_ORDERS.includes(sortOrder as any)) {
      return NextResponse.json(
        {
          message: `Invalid sortOrder. Must be one of: ${VALID_SORT_ORDERS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (limit > 100) {
      return NextResponse.json(
        { message: "Limit cannot exceed 100" },
        { status: 400 },
      );
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
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
