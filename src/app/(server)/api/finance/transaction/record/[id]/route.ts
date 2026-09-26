import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return apiError(401, "Unauthorized access");
  }

  try {
    const transaction = await db.finance.findUnique({
      where: { id },
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
    });

    if (!transaction) {
      return apiError(404, "Transaction not found");
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("[TRANSACTION_GET_ERROR]:", error);
    return apiError(500, "Internal server error");
  }
}
