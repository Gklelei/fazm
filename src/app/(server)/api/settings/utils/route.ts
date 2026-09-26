import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getCachedAcademy } from "@/lib/academy-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return apiError(401, "Unauthorized");
  }

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
      getCachedAcademy(),
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
    return apiError(500, "Internal server error");
  }
}
