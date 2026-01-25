import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const allAthletes = await db.athlete.findMany({
      where: {
        isArchived: false,
      },
      include: {
        address: true,
        medical: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    return NextResponse.json(allAthletes, { status: 200 });
  } catch (error) {
    console.error("Fetch Athletes Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch athletes" },
      { status: 500 }
    );
  }
}
