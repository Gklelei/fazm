/**
 * Cursor pagination, the one way lists page in this app: newest first,
 * ordered by (createdAt, id), and the cursor is the last row's id. Unlike
 * page numbers, rows added while someone scrolls don't shift or repeat.
 */
export const encodeCursor = (id: string) => Buffer.from(id).toString("base64url");

export const decodeCursor = (c: string | null | undefined) => {
  if (!c) return null;
  try {
    return Buffer.from(c, "base64url").toString("utf8") || null;
  } catch {
    return null;
  }
};

/** Prisma args for the page after `cursor` (fetch one extra row to know if there's more). */
export const cursorArgs = (cursor: string | null | undefined, take: number) => {
  const after = decodeCursor(cursor);
  return { take: take + 1, ...(after ? { cursor: { id: after }, skip: 1 } : {}) };
};

/** Trims the extra row and works out the next cursor. */
export function pageOf<T extends { id: string }>(rows: T[], take: number) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return { items, nextCursor: hasMore ? encodeCursor(items[items.length - 1].id) : null };
}
