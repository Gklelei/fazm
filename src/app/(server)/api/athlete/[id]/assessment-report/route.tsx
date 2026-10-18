import { headers } from "next/headers";
import { renderToStream } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { hasRole } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { getCachedAcademy } from "@/lib/academy-cache";
import { embeddableLogo } from "@/lib/pdf-logo";
import { athleteName } from "@/features/athletes/lib/names";
import { athleteProgress } from "@/features/assessments/queries/progress";
import AssessmentReport from "@/features/assessments/components/AssessmentReport";

/** GET /api/athlete/:athleteId/assessment-report: the athlete's progress report as a PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!hasRole(session.user.role, "athletes")) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const athlete = await db.athlete.findUnique({ where: { athleteId: id }, select: { id: true, athleteId: true, firstName: true, middleName: true, lastName: true, isArchived: true } });
  if (!athlete || athlete.isArchived) return new Response("Not found", { status: 404 });

  const [progress, cached] = await Promise.all([athleteProgress(athlete.athleteId), getCachedAcademy()]);
  const academy = cached ? { ...cached, logoUrl: await embeddableLogo(cached.logoUrl) } : null;
  const { protocol, host } = new URL(req.url);
  const name = athleteName(athlete);

  const stream = await renderToStream(
    <AssessmentReport athlete={{ name, athleteId: athlete.athleteId }} progress={progress} academy={academy} logoUrl={`${protocol}//${host}/Fazam Logo Half.jpg`} />,
  );
  await createAuditLog({
    action: "EXPORT",
    resource: "Assessment",
    details: `Downloaded ${name}'s progress report (${athlete.athleteId})`,
    userId: session.user.id,
    athleteId: athlete.id,
  });
  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="progress-${athlete.athleteId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
