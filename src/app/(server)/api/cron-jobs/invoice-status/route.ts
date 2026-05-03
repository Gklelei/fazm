import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    const result = await db.invoice.updateMany({
      where: {
        dueDate: {
          lte: now,
        },
        status: {
          in: ["PENDING", "PARTIAL"],
        },
      },
      data: {
        status: "OVERDUE",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        result.count > 0
          ? `Marked ${result.count} invoice(s) as OVERDUE`
          : "No invoices needed updating",
      updatedCount: result.count,
      executedAt: now.toISOString(),
    });
  } catch (e) {
    console.error("Update Invoice status cron job error:", e);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
