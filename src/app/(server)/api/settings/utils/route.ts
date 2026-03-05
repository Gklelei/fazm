import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Query PostgreSQL
    const [
      locations,
      drills,
      batches,
      coaches,
      attendance,
      expense,
      plans,
      academy,
    ] = await Promise.all([
      db.trainingLocations.findMany(),
      db.drills.findMany(),
      db.batches.findMany({}),
      db.staff.findMany({
        where: {
          user: {
            role: "COACH",
          },
        },
      }),
      db.tRAINING_ATTENDANCE_REASONS.findMany(),
      db.expenseCategories.findMany({
        where: { isArchived: false, status: "ACTIVE" },
        select: { name: true, id: true },
      }),
      db.subscriptionPlan.findMany({
        where: { isArchived: false },
        select: { id: true, name: true, amount: true },
      }),
      db.academy.findFirst(),
    ]);

    const resultPayload = {
      locations,
      drills,
      batches,
      coaches,
      attendance,
      expense,
      plans,
      academy,
    };

    return NextResponse.json(resultPayload);
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
