import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { listSessions, parseSessionParams } from "@/features/trainings/queries/list-sessions";

/** GET /api/sessions?view&search&batchId&cursor: one page of the sessions list (coaches see their own). */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.coaching]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const sp = req.nextUrl.searchParams;
  const { user } = authz.session;
  return NextResponse.json(
    await listSessions(parseSessionParams(Object.fromEntries(sp)), { userId: user.id, role: user.role ?? null }, sp.get("cursor")),
  );
}
