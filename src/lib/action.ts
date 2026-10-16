import "server-only";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { FORBIDDEN_MESSAGE, hasRole, type RoleGroup } from "@/lib/roles";

/** A problem worth telling the user about; its message is shown as is. */
export class ActionError extends Error {}

const GENERIC = "Something went wrong and nothing was saved. Try again.";

/**
 * What to tell the user about a failed action: our own ActionError messages,
 * the first form problem, or plain words for common database errors. Anything
 * else (a raw database or library message) stays in the server log.
 */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ActionError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Check the form and try again.";
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "That already exists. Use a different name or number.";
    if (error.code === "P2025") return "That record no longer exists. Refresh the page.";
    if (error.code === "P2003") return "That's still linked to other records, so it can't be changed this way.";
  }
  console.error(error);
  return GENERIC;
}

type User = { id: string; name: string; role?: string | null };

/**
 * Runs a server action body for a signed-in user in `group`. Thrown
 * ActionErrors come back as their message; anything else is logged here and
 * the user sees a plain sentence, never a database error.
 */
export async function asRole<T extends ActionResult>(
  group: RoleGroup,
  run: (user: User) => Promise<T>,
): Promise<T | ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, message: "Your session has ended. Sign in again." };
  if (!hasRole(session.user.role, group)) return { success: false, message: FORBIDDEN_MESSAGE };
  try {
    return await run(session.user);
  } catch (error) {
    return { success: false, message: actionErrorMessage(error) };
  }
}
