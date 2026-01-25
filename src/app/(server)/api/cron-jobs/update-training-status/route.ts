import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const result = await db.$transaction(async (ctx) => {
      const activeSessions = await ctx.training.findMany({
        where: {
          status: { in: ["IN_PROGRESS", "SCHEDULED"] },
          isArchived: false,
          date: { lte: now },
        },
        select: { id: true, date: true, duration: true, status: true },
      });

      const toInprogress: string[] = [];
      const toCompleted: string[] = [];

      activeSessions.forEach((session) => {
        const startTime = new Date(session.date).getTime();
        const endTime = startTime + session.duration * 60 * 1000;
        const currentTime = now.getTime();

        if (currentTime > endTime) {
          if (session.status !== "COMPLETED") toCompleted.push(session.id);
        } else if (currentTime > startTime) {
          if (session.status !== "IN_PROGRESS") toInprogress.push(session.id);
        }
      });

      const updates = [];
      if (toInprogress.length > 0) {
        updates.push(
          ctx.training.updateMany({
            where: { id: { in: toInprogress } },
            data: { status: "IN_PROGRESS" },
          }),
        );
      }

      if (toCompleted.length > 0) {
        updates.push(
          ctx.training.updateMany({
            where: { id: { in: toCompleted } },
            data: { status: "COMPLETED" },
          }),
        );
      }

      await Promise.all(updates);
      return {
        updatedToInProgress: toInprogress.length,
        updatedToCompleted: toCompleted.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Training statuses updated",
      ...result,
    });
  } catch (error) {
    console.error("Update Training status cron job error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
