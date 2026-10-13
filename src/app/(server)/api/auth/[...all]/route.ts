import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

/**
 * Self sign-up is closed. Accounts are created only server-side: staff by
 * an admin (Staff → Add staff member) and the first super admin by the
 * seeder. better-auth's disableSignUp can't be used because it also blocks
 * those server-side calls, so the public HTTP endpoint is refused here.
 */
export async function POST(request: Request) {
  if (new URL(request.url).pathname.includes("/sign-up/")) {
    return NextResponse.json({ error: "Sign-up is disabled" }, { status: 403 });
  }
  return handler.POST(request);
}

export const { GET } = handler;
