import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeaders = req.headers.get("authorization");
    if (authHeaders !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const scheduledTrainings = await db.training.findMany({
      where: {
        isArchived: false,
        status: "SCHEDULED",
        // If `date` is a DateTime in Prisma, this is best:
        date: { gt: now },
        // Optional: if batch can be archived and you have that field
        // batch: { isArchived: false },
      },
      select: {
        id: true,
        date: true,
        athletes: { select: { id: true } },
        batch: {
          select: {
            athletes: {
              where: { isArchived: false },
              select: { id: true },
            },
          },
        },
      },
    });

    let updatedSessions = 0;
    let totalAthletesConnected = 0;

    await db.$transaction(async (tx) => {
      for (const session of scheduledTrainings) {
        const currentAthletes = new Set(session.athletes.map((a) => a.id));

        const athletesToAdd = session.batch.athletes
          .filter((a) => !currentAthletes.has(a.id))
          .map((a) => ({ id: a.id }));

        if (athletesToAdd.length === 0) continue;

        await tx.training.update({
          where: { id: session.id },
          data: {
            athletes: {
              connect: athletesToAdd,
            },
          },
        });

        updatedSessions += 1;
        totalAthletesConnected += athletesToAdd.length;
      }
    });

    return NextResponse.json(
      {
        success: true,
        scannedSessions: scheduledTrainings.length,
        updatedSessions,
        totalAthletesConnected,
        message: `Scanned ${scheduledTrainings.length} scheduled future sessions. Updated ${updatedSessions} sessions; connected ${totalAthletesConnected} athletes.`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
