import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/prisma";
import { getCachedAcademy } from "@/lib/academy-cache";
import { embeddableLogo } from "@/lib/pdf-logo";
import { athleteName } from "@/features/athletes/lib/names";
import { buildStatement } from "./statement";
import { StatementDocument } from "../components/StatementDocument";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** A period from query text: anything that isn't YYYY-MM-DD is ignored. */
export const period = (from?: string | null, to?: string | null) => ({
  from: from && YMD.test(from) ? from : undefined,
  to: to && YMD.test(to) ? to : undefined,
});

/** An athlete's statement for a period as a PDF, for the download route and the email. Null when the athlete doesn't exist. */
export async function statementPdf(athleteId: string, range: { from?: string; to?: string }, baseUrl: string) {
  const a = await db.athlete.findUnique({
    where: { athleteId },
    select: {
      id: true,
      athleteId: true,
      firstName: true,
      middleName: true,
      lastName: true,
      isArchived: true,
      batches: { select: { name: true } },
      guardians: { select: { fullNames: true }, take: 1 },
      invoices: { include: { coupon: { select: { name: true } } } },
      finances: true,
    },
  });
  if (!a) return null;
  const statement = buildStatement({ invoices: a.invoices, payments: a.finances, ...range });
  const cached = await getCachedAcademy();
  const academy = cached ? { ...cached, logoUrl: await embeddableLogo(cached.logoUrl) } : null;
  const name = athleteName(a);
  const pdf = await renderToBuffer(
    <StatementDocument
      academy={academy}
      athlete={{ athleteId: a.athleteId, name, batch: a.batches?.name ?? null, guardian: a.guardians[0]?.fullNames ?? null }}
      statement={statement}
      {...range}
      logoUrl={`${baseUrl}/Fazam Logo Half.jpg`}
    />,
  );
  return { athlete: { id: a.id, athleteId: a.athleteId, name }, statement, pdf };
}
