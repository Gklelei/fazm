import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { apiError } from "@/lib/api-response";
import { ROLE_GROUPS } from "@/lib/roles";
import { invoiceFiltersFromParams, listInvoices } from "@/features/invoices/queries/list";

export async function GET(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return apiError(AUTHZ_HTTP_STATUS[authz.reason], "Unauthorized");

  const sp = req.nextUrl.searchParams;
  try {
    return NextResponse.json(
      await listInvoices(invoiceFiltersFromParams(sp), {
        cursor: sp.get("cursor"),
        pageSize: Number(sp.get("pageSize")) || undefined,
      }),
    );
  } catch (error) {
    console.error("[Invoices API]", error);
    return apiError(500, "Failed to fetch invoices");
  }
}
