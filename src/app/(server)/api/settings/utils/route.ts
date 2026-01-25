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
    const [locations, drills, batches, coaches, attendance] =
      await db.$transaction([
        db.trainingLocations.findMany(),
        db.drills.findMany(),
        db.batches.findMany(),
        db.staff.findMany(),
        db.tRAINING_ATTENDANCE_REASONS.findMany(),
      ]);

    return NextResponse.json({
      locations,
      drills,
      batches,
      coaches,
      attendance,
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
