import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return apiError(401, "Unauthorized access");
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
      return apiError(404, "Athlete not found");
    }

    return NextResponse.json(athlete);
  } catch (error) {
    console.log({ error });
    return apiError(500, "Internal server error");
  }
}
