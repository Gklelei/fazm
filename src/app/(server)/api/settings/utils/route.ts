import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
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
      db.batches.findMany(),
      db.staff.findMany(),
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

    return NextResponse.json({
      locations,
      drills,
      batches,
      coaches,
      attendance,
      expense,
      plans,
      academy,
    });
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
