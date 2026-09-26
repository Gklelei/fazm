import { db } from "@/lib/prisma";
import AthletesData from "@/Modules/Users/AthletesOnboarding/client/Components/AthletesData";
import { encodeCursor } from "@/app/(server)/api/athlete/athletes-all/route";
import type { AthletesInfiniteData } from "@/Modules/Users/AthletesOnboarding/Api/FetchAllAthletes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Athletes" };

const PAGE_SIZE = 10;

export default async function Page() {
  // Mirrors GET /api/athlete/athletes-all with no search/cursor, so the
  // client's react-query cache can be seeded with this exact first page
  // instead of the browser re-fetching it immediately after render.
  const rows = await db.athlete.findMany({
    where: { isArchived: false },
    include: { address: true, medical: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const nextCursor =
    hasMore && items.length
      ? encodeCursor({
          createdAt: items[items.length - 1].createdAt.toISOString(),
          id: items[items.length - 1].id,
        })
      : null;

  const initialData: AthletesInfiniteData = {
    pages: [
      {
        allAthletes: JSON.parse(JSON.stringify(items)),
        nextCursor,
        pageSize: PAGE_SIZE,
      },
    ],
    pageParams: [""],
  };

  return <AthletesData initialData={initialData} />;
}
