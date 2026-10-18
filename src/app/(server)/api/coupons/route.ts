import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { couponFiltersFromParams, listCoupons } from "@/features/coupons/queries/list";

/** GET /api/coupons?search=&state=&cursor=: one page of the coupons list. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listCoupons(couponFiltersFromParams(sp), sp.get("cursor")));
}
