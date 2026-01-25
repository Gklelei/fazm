import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  await db.$queryRaw`SELECT 1`;
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
  });
}
