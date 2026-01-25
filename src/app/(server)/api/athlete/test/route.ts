import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { search } = Object.fromEntries(req.nextUrl.searchParams.entries()) as {
    search?: string;
  };

  if (!search || search.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const players = await db.athlete.findMany({
      where: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      },
      take: 20,
    });

    return NextResponse.json(players);
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
