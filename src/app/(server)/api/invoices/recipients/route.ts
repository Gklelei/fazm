import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { athleteName } from "@/features/athletes/lib/names";
import { recipientsInBatches } from "@/features/invoices/lib/recipients";

/** GET /api/invoices/recipients?batches=a,b: the athletes billing those batches would invoice. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const batches = (req.nextUrl.searchParams.get("batches") ?? "").split(",").filter(Boolean).slice(0, 50);
  const athletes = await recipientsInBatches(batches);
  return NextResponse.json({
    athletes: athletes.map((a) => ({ athleteId: a.athleteId, name: athleteName(a), batchId: a.batchesId })),
  });
}
