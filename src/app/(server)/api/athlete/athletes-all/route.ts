import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE_DEFAULT = 10;

type CursorPayload = { createdAt: string; id: string };

function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const take = Math.min(
    parseInt(sp.get("pageSize") || `${PAGE_SIZE_DEFAULT}`, 10),
    50,
  );
  const search = (sp.get("search") || "").trim();
  const cursor = sp.get("cursor");

  const where = {
    isArchived: false,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { middleName: { contains: search, mode: "insensitive" as const } },
            { athleteId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  try {
    const decoded = cursor ? decodeCursor(cursor) : null;
    const rows = await db.athlete.findMany({
      where,
      include: { address: true, medical: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(decoded
        ? {
            cursor: { id: decoded.id },
            skip: 1,
          }
        : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    const nextCursor =
      hasMore && items.length
        ? encodeCursor({
            createdAt: items[items.length - 1].createdAt.toISOString(),
            id: items[items.length - 1].id,
          })
        : null;

    return NextResponse.json(
      { allAthletes: items, nextCursor, pageSize: take },
      { status: 200 },
    );
  } catch (error) {
    console.error("Fetch Athletes Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch athletes" },
      { status: 500 },
    );
  }
}
