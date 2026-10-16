import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { getUtils } from "@/lib/lookups";

export const dynamic = "force-dynamic";

/** Refetch of the settings lookups after a change (first value comes with the page). */
export async function GET() {
  const authz = await checkRole();
  if (!authz.ok) {
    return apiError(AUTHZ_HTTP_STATUS[authz.reason], "Unauthorized");
  }
  try {
    return NextResponse.json(await getUtils());
  } catch (error) {
    console.error("Settings lookups failed:", error);
    return apiError(500, "Internal server error");
  }
}
