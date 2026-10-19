import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { listMovements } from "@/features/shop/queries";

/** GET /api/shop/stock?cursor=: one page of stock movements, newest first. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  return NextResponse.json(await listMovements(req.nextUrl.searchParams.get("cursor")));
}
