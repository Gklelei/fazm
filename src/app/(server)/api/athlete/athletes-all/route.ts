import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { apiError } from "@/lib/api-response";
import { athleteFiltersFromParams } from "@/features/athletes/queries/filters";
import { listAthletes } from "@/features/athletes/queries/list";

export async function GET(req: NextRequest) {
  const authz = await checkRole();
  if (!authz.ok) return apiError(AUTHZ_HTTP_STATUS[authz.reason], "Unauthorized");

  const sp = req.nextUrl.searchParams;
  try {
    const page = await listAthletes(athleteFiltersFromParams(sp), {
      cursor: sp.get("cursor"),
      pageSize: Number(sp.get("pageSize")) || undefined,
    });
    return NextResponse.json(page);
  } catch (error) {
    console.error("Fetch athletes failed:", error);
    return apiError(500, "Failed to fetch athletes");
  }
}
