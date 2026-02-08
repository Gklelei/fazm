import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { INVOICE_STATUS } from "@/generated/prisma/enums";

type Cursor = { createdAt: string; id: string };

function parseCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Cursor;
    if (!parsed?.createdAt || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const pageSize = Number(searchParams.get("pageSize") ?? "10");

  const rawStatus = searchParams.get("status");
  const status = Object.values(INVOICE_STATUS).includes(
    rawStatus as INVOICE_STATUS,
  )
    ? (rawStatus as INVOICE_STATUS)
    : undefined;

  const cursor = parseCursor(searchParams.get("cursor"));
  const where = {
    ...(status ? { status: { equals: status } } : {}),
    ...(search
      ? {
          OR: [
            {
              invoiceNumber: { contains: search, mode: "insensitive" as const },
            },
            {
              athlete: {
                firstName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              athlete: {
                lastName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              athlete: {
                athleteId: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
    ...(cursor
      ? {
          OR: [
            { createdAt: { lt: new Date(cursor.createdAt) } },
            {
              createdAt: new Date(cursor.createdAt),
              id: { lt: cursor.id },
            },
          ],
        }
      : {}),
  };

  try {
    const items = await db.invoice.findMany({
      take: pageSize,
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        athlete: {
          select: {
            athleteId: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
        subscriptionPlan: { select: { name: true, code: true } },
      },
    });

    const last = items[items.length - 1];
    const nextCursor =
      items.length === pageSize && last
        ? JSON.stringify({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          } satisfies Cursor)
        : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.log({ error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
