import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({
      error: "Unauthorized access",
    });
  }
  const { id } = await params;
  try {
    const athlete = await db.athlete.findUnique({
      where: {
        athleteId: id,
        isArchived: false,
      },
      include: {
        address: true,
        emergencyContacts: true,
        guardians: true,
        medical: true,
      },
    });
    if (!athlete) {
      return NextResponse.json(
        {
          error: "Athlete not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(athlete);
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
