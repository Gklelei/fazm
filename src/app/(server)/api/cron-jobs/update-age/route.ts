import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

function calcAge(dob: Date, today = new Date()) {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export async function POST() {
  const h = await headers();
  const authHeader = h.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const today = new Date();

    const athletes = await db.athlete.findMany({
      select: { id: true, dateOfBirth: true },
    });

    const ops = athletes
      .filter((a) => !!a.dateOfBirth)
      .map((a) => {
        const dob = new Date(a.dateOfBirth);
        const age = calcAge(dob, today);

        return db.athlete.update({
          where: { id: a.id },
          data: { age },
        });
      });

    const results = await Promise.allSettled(ops);
    const updated = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      ok: true,
      updated,
      failed,
      total: athletes.length,
    });
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

