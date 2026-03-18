import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { INVOICE_STATUS } from "@/generated/prisma/enums";

const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const pageSize = Math.min(
    Number(searchParams.get("pageSize") ?? "10"),
    MAX_PAGE_SIZE,
  );

  const rawStatus = searchParams.get("status");
  const status = Object.values(INVOICE_STATUS).includes(
    rawStatus as INVOICE_STATUS,
  )
    ? (rawStatus as INVOICE_STATUS)
    : undefined;

  // ── Cursor: base64url-encoded JSON { id } ──────────────────────────
  const rawCursor = searchParams.get("cursor");
  let cursorId: string | undefined;
  if (rawCursor) {
    try {
      const parsed = JSON.parse(
        Buffer.from(rawCursor, "base64url").toString("utf8"),
      ) as { id: string };
      cursorId = parsed?.id || undefined;
    } catch {
      /* ignore malformed cursor */
    }
  }

  // ── Build where (search + status — cursor handled via Prisma cursor) ─
  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              athlete: {
                firstName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              athlete: {
                lastName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              athlete: {
                athleteId: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  try {
    const items = await db.invoice.findMany({
      take: pageSize + 1, // fetch one extra to know if there's a next page
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
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

    const hasMore = items.length > pageSize;
    const page = hasMore ? items.slice(0, pageSize) : items;
    const last = page[page.length - 1];

    const nextCursor =
      hasMore && last
        ? Buffer.from(JSON.stringify({ id: last.id })).toString("base64url")
        : null;

    return NextResponse.json({ items: page, nextCursor });
  } catch (error) {
    console.error("[Invoices API]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
