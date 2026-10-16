import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FORBIDDEN_MESSAGE, hasRole, type RoleGroup } from "@/lib/roles";

/** A problem worth telling the user about; its message is shown as is. */
export class ActionError extends Error {}

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
    if (error instanceof ActionError) return { success: false, message: error.message };
    console.error(error);
    return { success: false, message: "Something went wrong and nothing was saved. Try again." };
  }
}
