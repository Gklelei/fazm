import "server-only";
import { db } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { invoiceBalance } from "@/features/invoices/lib/status";
import { athleteName } from "@/features/athletes/lib/names";
import { siblingPhoneKey } from "../lib/phone-key";

const member = {
  athleteId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  status: true,
  batches: { select: { name: true } },
  invoices: {
    where: { status: { not: "CANCELED" } },
    select: { invoiceNumber: true, description: true, dueDate: true, amountDue: true, discount: true, amountPaid: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.AthleteSelect;

type Row = {
  athleteId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  status: string;
  batches: { name: string } | null;
  invoices: (Parameters<typeof invoiceBalance>[0] & { invoiceNumber: string; description: string | null; dueDate: Date })[];
};
const view = (a: Row) => {
  const open = a.invoices
    .map((i) => ({ invoiceNumber: i.invoiceNumber, description: i.description, dueDate: i.dueDate.toISOString(), balance: invoiceBalance(i) }))
    .filter((i) => i.balance > 0);
  return {
    athleteId: a.athleteId,
    name: athleteName(a),
    batch: a.batches?.name ?? null,
    status: a.status,
    owes: open.reduce((s, i) => s + i.balance, 0),
    open,
  };
};
export type FamilyMember = ReturnType<typeof view>;

/**
 * An athlete's confirmed family (themselves included), and athletes whose
 * guardian has the same mobile number who could be linked.
 */
export async function familyOf(athleteId: string) {
  const a = await db.athlete.findUnique({
    where: { athleteId },
    select: { familyId: true, guardians: { select: { phoneNumber: true } } },
  });
  if (!a) return null;

  const members = a.familyId
    ? await db.athlete.findMany({ where: { familyId: a.familyId, isArchived: false }, select: member, orderBy: { createdAt: "asc" } })
    : [];

  const keys = new Set(a.guardians.map((g) => siblingPhoneKey(g.phoneNumber)).filter((k): k is string => !!k));
  const linked = new Set([athleteId, ...members.map((m) => m.athleteId)]);
  // Phones are stored as typed (+254 711…, 0711…): compare the last 9 digits in the database
  const last9 = [...keys].map((k) => k.slice(1));
  const matches = last9.length
    ? await db.$queryRaw<{ athlete_id: string; phone_number: string }[]>`
        SELECT g.athlete_id, g.phone_number FROM athlete_guardian g JOIN athlete a ON a.athlete_id = g.athlete_id
        WHERE a.is_archived = false AND right(regexp_replace(g.phone_number, '[^0-9]', '', 'g'), 9) = ANY(${last9}) LIMIT 50`
    : [];
  // …then check each properly (placeholders and malformed numbers drop out)
  const ids = [...new Set(matches.filter((m) => keys.has(siblingPhoneKey(m.phone_number) ?? "")).map((m) => m.athlete_id))].filter((id) => !linked.has(id));
  const others = ids.length ? await db.athlete.findMany({ where: { athleteId: { in: ids } }, select: { ...member, familyId: true }, orderBy: { createdAt: "asc" } }) : [];
  const suggestions = others.map((o) => ({ ...view(o), inOtherFamily: !!o.familyId }));

  return { familyId: a.familyId, members: members.map(view), suggestions };
}

export type Family = NonNullable<Awaited<ReturnType<typeof familyOf>>>;
