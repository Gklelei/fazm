// import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
// import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // const session = await auth.api.getSession({
  //   headers: await headers(),
  // });

  // if (!session?.user) {
  //   return NextResponse.json(
  //     {
  //       message: "UnAuthorized access, please login",
  //     },
  //     { status: 401 }
  //   );
  // }
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
    ] = await db.$transaction([
      db.trainingLocations.findMany(),
      db.drills.findMany(),
      db.batches.findMany(),
      db.staff.findMany(),
      db.tRAINING_ATTENDANCE_REASONS.findMany(),
      db.expenseCategories.findMany({
        where: {
          isArchived: false,
          status: "ACTIVE",
        },
        select: {
          name: true,
          id: true,
        },
      }),
      db.subscriptionPlan.findMany({
        where: {
          isArchived: false,
        },
        select: {
          id: true,
          name: true,
          amount: true,
        },
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
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
