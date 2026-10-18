import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { couponInvoices } from "@/features/coupons/queries/usage";

/** GET /api/coupons/:id/invoices?cursor=: invoices the coupon discounted. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  return NextResponse.json(await couponInvoices((await params).id, req.nextUrl.searchParams.get("cursor")));
}
