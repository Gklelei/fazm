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

function parseDob(input: string): Date | null {
  if (!input) return null;
  const s = input.trim();

  // ISO: 2008-07-14 or 2008-07-14T...
  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;

  // Normalize separators
  const parts = s.replace(/\./g, "/").replace(/-/g, "/").split("/");
  if (parts.length !== 3) return null;

  const [p1, p2, p3] = parts.map((x) => x.trim());

  // Decide format by length of year part
  // If first part is 4 digits => YYYY/MM/DD
  if (p1.length === 4) {
    const y = Number(p1);
    const m = Number(p2);
    const d = Number(p3);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  // Otherwise assume DD/MM/YYYY
  if (p3.length === 4) {
    const d = Number(p1);
    const m = Number(p2);
    const y = Number(p3);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  return null;
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

    let invalidDob = 0;

    const ops = athletes.map((a) => {
      const dob = parseDob(String(a.dateOfBirth));
      if (!dob || Number.isNaN(dob.getTime())) {
        invalidDob++;
        return Promise.resolve(null);
      }

      const age = calcAge(dob, today);
      if (!Number.isFinite(age) || age < 0 || age > 120) {
        invalidDob++;
        return Promise.resolve(null);
      }

      return db.athlete.update({
        where: { id: a.id },
        data: { age },
      });
    });

    const results = await Promise.allSettled(ops);
    const updated = results.filter(
      (r) => r.status === "fulfilled" && r.value !== null,
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // show first few errors if any
    const sampleFailures = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.status === "rejected")
      .slice(0, 5)
      .map(({ r, i }) => ({
        athleteId: athletes[i]?.id,
        reason:
          (r as PromiseRejectedResult).reason?.message ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          String((r as any).reason),
      }));

    return NextResponse.json({
      ok: true,
      total: athletes.length,
      updated,
      failed,
      invalidDob,
      sampleFailures,
    });
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
