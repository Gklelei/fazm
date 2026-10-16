import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { recipientsInBatches } from "@/features/invoices/lib/recipients";

/** GET /api/invoices/recipients?batches=a,b: how many invoices billing those batches would create. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const batches = (req.nextUrl.searchParams.get("batches") ?? "").split(",").filter(Boolean).slice(0, 50);
  return NextResponse.json({ count: (await recipientsInBatches(batches)).length });
}
