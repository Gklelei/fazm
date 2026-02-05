import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { subMonths } from "date-fns";

// Optional: if you want a simple shared secret to prevent random calls
function assertCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const header = req.headers.get("x-cron-secret");
  if (header !== secret) {
    throw new Error("Unauthorized cron request");
  }
}

export async function POST(req: Request) {
  try {
    assertCronAuth(req);

    const cutoff = subMonths(new Date(), 3);

    // Strategy:
    // 1) Only consider non-archived athletes
    // 2) Find athletes where ALL activity relations have no records newer than cutoff
    //    - For each relation: "none newer than cutoff" == none: { createdAt: { gte: cutoff } }
    //    - If you also want to treat "no records at all" as inactive, this still works.

    const inactiveAthletes = await db.athlete.findMany({
      where: {
        isArchived: false,

        // If you only want to deactivate ACTIVE/PENDING accounts, add:
        // status: { in: ["ACTIVE", "PENDING"] },

        AND: [
          {
            athleteSubscriptions: {
              none: {
                // change field name if yours differs
                createdAt: { gte: cutoff },
              },
            },
          },
          {
            assessments: {
              none: {
                createdAt: { gte: cutoff },
              },
            },
          },
          {
            invoices: {
              none: {
                createdAt: { gte: cutoff },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (inactiveAthletes.length === 0) {
      return NextResponse.json({
        ok: true,
        deactivated: 0,
        cutoff,
      });
    }

    const ids = inactiveAthletes.map((a) => a.id);

    const result = await db.athlete.updateMany({
      where: {
        id: { in: ids },
        isArchived: false,
      },
      data: {
        status: "DEACTIVATED", // <-- change to your enum value if different
      },
    });

    return NextResponse.json({
      ok: true,
      deactivated: result.count,
      cutoff,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Cron failed" },
      { status: 500 },
    );
  }
}
