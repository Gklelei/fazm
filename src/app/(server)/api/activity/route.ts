import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { activityFiltersFromParams, listActivity } from "@/features/audit-logs/queries/list";

/** GET /api/activity?kind&person&area&from&to&q&cursor: the activity log, one page at a time. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.admin]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listActivity(activityFiltersFromParams((k) => sp.get(k)), sp.get("cursor")));
}
