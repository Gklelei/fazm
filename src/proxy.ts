import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getAllowedRolesForPath } from "@/components/SideBarItems";
import { ROLES } from "./generated/prisma/enums";

// Proxy files always run on the Node.js runtime (unlike the old
// middleware.ts convention, which needed an explicit opt-in) — that's what
// lets this call better-auth's session lookup through the Prisma/pg adapter.

export const config = {
  matcher: [
    /*
     * Match every request except:
     * - /api routes (each has its own auth checks)
     * - Next.js internals and static assets
     * - the public auth pages themselves
     * - files served from /public (images etc.) — otherwise a logged-out
     *   request for /login-hero.png is redirected to /sign-in and breaks
     */
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|sign-in|res-password|.*\\.(?:png|jpe?g|gif|svg|webp|ico|txt)$).*)",
  ],
};

export async function proxy(request: NextRequest) {
  // returnHeaders: when better-auth slides the session forward it also
  // re-issues the session cookie. Server components can't set cookies, so
  // the proxy - which runs on every navigation - forwards it; otherwise the
  // browser cookie expires a fixed time after sign-in, however active the
  // user is.
  const { headers: authHeaders, response: session } =
    await auth.api.getSession({ headers: request.headers, returnHeaders: true });

  const withAuthCookies = (res: NextResponse) => {
    for (const cookie of authHeaders?.getSetCookie() ?? []) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  };

  if (!session?.user) {
    return withAuthCookies(
      NextResponse.redirect(new URL("/sign-in", request.url)),
    );
  }

  const allowedRoles = getAllowedRolesForPath(request.nextUrl.pathname);
  if (
    allowedRoles &&
    !allowedRoles.includes((session.user.role as ROLES) ?? "")
  ) {
    return withAuthCookies(NextResponse.redirect(new URL("/", request.url)));
  }

  return withAuthCookies(NextResponse.next());
}
