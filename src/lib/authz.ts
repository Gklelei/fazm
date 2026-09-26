import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AuthzResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

/**
 * Centralizes the session-lookup + role-check boilerplate repeated across
 * server actions and API routes. `allowedRoles` omitted means "any signed-in
 * user"; passing it also enforces membership.
 */
export async function checkRole(allowedRoles?: string[]): Promise<AuthzResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role ?? "")) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, session };
}

export const AUTHZ_ACTION_MESSAGES: Record<"unauthenticated" | "forbidden", string> = {
  unauthenticated: "Unauthorized access,Please login to continue",
  forbidden: "You are not allowed to perform this operation",
};

export const AUTHZ_HTTP_STATUS: Record<"unauthenticated" | "forbidden", number> = {
  unauthenticated: 401,
  forbidden: 403,
};
