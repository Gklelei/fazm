// Integration tests: real Prisma + Postgres, fake request context.
// Only the sign-in session and Next's request/cache helpers are replaced.
import "dotenv/config";
import { vi } from "vitest";
import { currentSession } from "./session";

const url =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL?.replace(/\/([^/?]+)(\?|$)/, "/$1_test$2");
if (!url || !/\/[^/?]+_test(\?|$)/.test(url)) {
  throw new Error("Integration tests need a database whose name ends in _test");
}
process.env.DATABASE_URL = url;

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
  refresh: () => {},
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => currentSession() } },
}));
