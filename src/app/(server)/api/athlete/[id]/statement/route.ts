import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { period, statementPdf } from "@/features/finance/lib/statement-pdf";
import { resolveAthleteId } from "@/features/athletes/lib/athlete-ref";
import { athleteFileName } from "@/features/athletes/lib/athlete-links";

/** GET /api/athlete/:athleteId/statement?from=YYYY-MM-DD&to=YYYY-MM-DD: the athlete's statement as a PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!hasRole(session.user.role, "finance")) return new Response("Forbidden", { status: 403 });

  const id = await resolveAthleteId((await params).id);
  if (!id) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const range = period(url.searchParams.get("from"), url.searchParams.get("to"));
  const made = await statementPdf(id, range, `${url.protocol}//${url.host}`);
  if (!made) return new Response("Not found", { status: 404 });

  await createAuditLog({
    action: "EXPORT",
    resource: "Finance",
    details: `Downloaded ${made.athlete.name}'s statement (${made.athlete.athleteId})`,
    userId: session.user.id,
    athleteId: made.athlete.id,
  });
  return new Response(new Uint8Array(made.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${athleteFileName("statement", made.athlete.athleteId)}"`,
      "Cache-Control": "no-store",
    },
  });
}
