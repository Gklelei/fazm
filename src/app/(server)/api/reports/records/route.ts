import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { drillFromParams, drillRecords } from "@/features/reports/queries/records";
import { selectedProgrammeId } from "@/lib/programme";

/** GET /api/reports/records?series=fees|shop|income|spent&from=&to=[&batch|method|category]: the records behind a Reports bar or row. */
export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });
  const q = drillFromParams(req.nextUrl.searchParams);
  if (!q) return NextResponse.json({ error: "Pick a period" }, { status: 400 });
  return NextResponse.json(await drillRecords(q, await selectedProgrammeId()));
}
