import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { listSales, saleFiltersFromParams } from "@/features/shop/queries";

/** GET /api/shop/sales?search=&status=&cursor=: one page of sales. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listSales(saleFiltersFromParams(sp), sp.get("cursor")));
}
