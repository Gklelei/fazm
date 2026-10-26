import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/prisma";
import { getCachedAcademy } from "@/lib/academy-cache";
import { embeddableLogo } from "@/lib/pdf-logo";
import { athleteName } from "@/features/athletes/lib/names";
import { buildStatement } from "./statement";
import { FamilyStatementDocument, StatementDocument } from "../components/StatementDocument";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** A period from query text: anything that isn't YYYY-MM-DD is ignored. */
export const period = (from?: string | null, to?: string | null) => ({
  from: from && YMD.test(from) ? from : undefined,
  to: to && YMD.test(to) ? to : undefined,
});

const SELECT = {
  id: true,
  athleteId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  batches: { select: { name: true } },
  guardians: { select: { fullNames: true }, take: 1 },
  invoices: { include: { discounts: { select: { id: true, label: true, amount: true }, orderBy: { createdAt: "asc" as const } } } },
  finances: true,
} as const;

export async function letterhead() {
  const cached = await getCachedAcademy();
  return cached ? { ...cached, logoUrl: await embeddableLogo(cached.logoUrl) } : null;
}

/** A family's statement (every linked child) as a PDF. Null when the athlete isn't in a family. */
export async function familyStatementPdf(athleteId: string, range: { from?: string; to?: string }, baseUrl: string) {
  const a = await db.athlete.findUnique({ where: { athleteId }, select: { familyId: true } });
  if (!a?.familyId) return null;
  const kids = await db.athlete.findMany({ where: { familyId: a.familyId, isArchived: false }, select: SELECT, orderBy: { createdAt: "asc" } });
  const members = kids.map((k) => ({
    athlete: { athleteId: k.athleteId, name: athleteName(k), batch: k.batches?.name ?? null, guardian: k.guardians[0]?.fullNames ?? null },
    statement: buildStatement({ invoices: k.invoices, payments: k.finances, ...range }),
  }));
  const pdf = await renderToBuffer(<FamilyStatementDocument academy={await letterhead()} members={members} {...range} logoUrl={`${baseUrl}/Fazam Logo Half.jpg`} />);
  return { members, kids: kids.map((k) => ({ id: k.id, athleteId: k.athleteId })), pdf };
}

/** An athlete's statement for a period as a PDF, for the download route and the email. Null when the athlete doesn't exist. */
export async function statementPdf(athleteId: string, range: { from?: string; to?: string }, baseUrl: string) {
  const a = await db.athlete.findUnique({ where: { athleteId }, select: SELECT });
  if (!a) return null;
  const statement = buildStatement({ invoices: a.invoices, payments: a.finances, ...range });
  const academy = await letterhead();
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
