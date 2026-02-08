import { db } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = new URLSearchParams(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search") || "";

  try {
    const allAthletes = await db.athlete.findMany({
      where: {
        isArchived: false,
        OR: [
          {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            middleName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            athleteId: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        address: true,
        medical: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const nextCursor = allAthletes.length === pageSize ? page + 1 : null;

    const items = {
      allAthletes,
      nextCursor,
    };

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Fetch Athletes Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch athletes" },
      { status: 500 },
    );
  }
}
