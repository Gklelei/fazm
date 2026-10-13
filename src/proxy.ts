import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getAllowedRolesForPath } from "@/components/layout/nav-config";
import { ROLES } from "./generated/prisma/enums";

// Proxy files always run on the Node.js runtime (unlike the old
// middleware.ts convention, which needed an explicit opt-in) — that's what
// lets this call better-auth's session lookup through the Prisma/pg adapter.

export const config = {
  matcher: [
    /*
     * Match every request except:
     * - /api/auth (sign-in, change-password...), /api/cron-jobs (own secret)
     *   and /api/health; other /api routes pass through here only for the
     *   must-change-password lock, their own handlers check sign-in
     * - Next.js internals and static assets
     * - the public auth pages themselves
     * - files served from /public (images etc.) — otherwise a logged-out
     *   request for /login-hero.png is redirected to /sign-in and breaks
     */
    "/((?!api/auth|api/cron-jobs|api/health|_next/static|_next/image|favicon.ico|uploads|sign-in|res-password|.*\\.(?:png|jpe?g|gif|svg|webp|ico|txt)$).*)",
  ],
};

export async function proxy(request: NextRequest) {
  // returnHeaders: when better-auth slides the session forward it also
  // re-issues the session cookie. Server components can't set cookies, so
  // the proxy - which runs on every navigation - forwards it; otherwise the
  // browser cookie expires a fixed time after sign-in, however active the
  // user is.
  let { headers: authHeaders, response: session } =
    await auth.api.getSession({ headers: request.headers, returnHeaders: true });
  // Cached session data from before the password policy lacks the flag;
  // read it fresh once so nobody slips through on an old cookie.
  if (session?.user && session.user.mustChangePassword === undefined) {
    ({ headers: authHeaders, response: session } = await auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true },
      returnHeaders: true,
    }));
  }
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  const withAuthCookies = (res: NextResponse) => {
    for (const cookie of authHeaders?.getSetCookie() ?? []) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  };

  if (!session?.user) {
    // API handlers answer 401 themselves
    if (isApi) return withAuthCookies(NextResponse.next());
    return withAuthCookies(
      NextResponse.redirect(new URL("/sign-in", request.url)),
    );
  }

  // Until the password meets the policy, the account can do nothing else
  if (session.user.mustChangePassword) {
    if (isApi) {
      return withAuthCookies(
        NextResponse.json({ error: "Change your password to continue." }, { status: 403 }),
      );
    }
    if (pathname !== "/change-password") {
      return withAuthCookies(NextResponse.redirect(new URL("/change-password", request.url)));
    }
    return withAuthCookies(NextResponse.next());
  }
  if (pathname === "/change-password" || isApi) return withAuthCookies(NextResponse.next());

  const allowedRoles = getAllowedRolesForPath(pathname);
  if (
    allowedRoles &&
    !allowedRoles.includes((session.user.role as ROLES) ?? "")
  ) {
    return withAuthCookies(NextResponse.redirect(new URL("/", request.url)));
  }

  return withAuthCookies(NextResponse.next());
}
