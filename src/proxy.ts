import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getAllowedRolesForPath } from "@/components/SideBarItems";

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
     */
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|sign-in|sign-up|res-password).*)",
  ],
};

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const allowedRoles = getAllowedRolesForPath(request.nextUrl.pathname);
  if (allowedRoles && !allowedRoles.includes(session.user.role ?? "")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
