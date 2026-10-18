import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { familyStatementPdf, period } from "@/features/finance/lib/statement-pdf";

/** GET /api/athlete/:athleteId/family-statement?from&to: the statement of the athlete's whole family as a PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!hasRole(session.user.role, "finance")) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const url = new URL(req.url);
  const made = await familyStatementPdf(id, period(url.searchParams.get("from"), url.searchParams.get("to")), `${url.protocol}//${url.host}`);
  if (!made) return new Response("Not in a family", { status: 404 });

  await createAuditLog({
    action: "EXPORT",
    resource: "Finance",
    details: `Downloaded the family statement for ${made.members.map((m) => m.athlete.athleteId).join(", ")}`,
    userId: session.user.id,
    recordId: id,
  });
  return new Response(new Uint8Array(made.pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="family-statement-${id}.pdf"`, "Cache-Control": "no-store" },
  });
}
