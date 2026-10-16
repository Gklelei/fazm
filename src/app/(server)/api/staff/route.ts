import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { listStaff, staffFiltersFromParams } from "@/features/staff/queries/list";

/** GET /api/staff?search=&access=&cursor=: one page of the staff list. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.admin]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listStaff(staffFiltersFromParams(sp), sp.get("cursor")));
}
