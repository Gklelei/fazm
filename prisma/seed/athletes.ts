import { db } from "@/lib/prisma";
import type { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";
import { batchIdForAge } from "./reference";
import {
  ageOn,
  clean,
  inChunks,
  normalizePhone,
  parseDate,
  readCsv,
  toDateInput,
} from "./utils";

/** Columns of data.csv that are used (the export has ~50). */
type Row = {
  id: string; // "FP12"
  first_name: string;
  middle_name: string;
  last_name: string;
  dob: string; // "June 10, 2020"
  status: string; // active | inactive
  phone: string; // the guardian's number, without leading 0
  address_line1: string;
  address_line2: string;
  city: string;
  height_cm: string;
  weight_kg: string;
  dominant_foot: string;
  dominant_hand: string;
  positions: string;
  blood_type: string;
  allergies: string;
  medical_notes: string;
  emergency_contact_name: string;
  join_date: string; // "12/11/2024" — the registration date
};

const CHUNK = 10;

const atMidday = (d: Date | null) =>
  d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12) : undefined; // stays under the pg pool size (5 connections × 2 queries)

/** "FP12" → 12 */
const sourceNumber = (id: string) => Number(id.replace(/\D/g, "")) || null;

export const athleteIdFor = (n: number) =>
  `ATH-FFA-${String(n).padStart(3, "0")}`;

/** positions arrive as [], "[]", "[\"\"]" or a JSON list */
function parsePositions(v: string): string[] {
  try {
    let parsed: unknown = JSON.parse(v);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return Array.isArray(parsed)
      ? parsed.map((p) => String(p).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

const list = (v: string) =>
  (clean(v) ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s && !/^none$/i.test(s));

function toAthlete(row: Row) {
  const n = sourceNumber(row.id);
  if (!n) throw new Error(`invalid id "${row.id}"`);

  const dob = parseDate(row.dob);
  const age = dob ? ageOn(dob) : null;
  const guardianName = clean(row.emergency_contact_name);
  const guardianPhone = normalizePhone(row.phone);
  const status: ATHLETE_ACCOUNT_STATUS =
    row.status.trim().toLowerCase() === "active" ? "ACTIVE" : "DEACTIVATED";

  return {
    n,
    athleteId: athleteIdFor(n),
    core: {
      firstName: clean(row.first_name) ?? "Unknown",
      middleName: clean(row.middle_name),
      lastName: clean(row.last_name) ?? "",
      dateOfBirth: dob ? toDateInput(dob) : "",
      age,
      status,
      batchesId: batchIdForAge(age),
      height: clean(row.height_cm) ?? "",
      weight: clean(row.weight_kg) ?? "",
      foot: clean(row.dominant_foot) ?? "",
      hand: clean(row.dominant_hand) ?? "",
      positions: parsePositions(row.positions),
      // The export repeats one academy email for every row, and athlete
      // email is unique, so it is not imported.
      email: null,
      // `phone` belongs to the guardian (siblings share it) — stored there.
      phoneNumber: null,
    },
    // Midday, so the calendar day survives any server/UTC offset
    createdAt: atMidday(parseDate(row.join_date)),
    address: {
      country: "KENYA",
      town: clean(row.city) ?? "",
      addressLine1: clean(row.address_line1) ?? "",
      addressLine2: clean(row.address_line2) ?? "",
      estate: clean(row.address_line2) ?? "",
    },
    medical: {
      bloogGroup: clean(row.blood_type) ?? "Unknown",
      allergies: list(row.allergies),
      medicalConditions: list(row.medical_notes),
    },
    guardian:
      guardianName || guardianPhone
        ? {
            fullNames: guardianName ?? "Guardian",
            phoneNumber: guardianPhone ?? "",
            relationship: "Guardian",
            email: "",
          }
        : null,
  };
}

async function upsertAthlete(a: ReturnType<typeof toAthlete>) {
  await db.$transaction(async (tx) => {
    const athlete = await tx.athlete.upsert({
      where: { athleteId: a.athleteId },
      create: { athleteId: a.athleteId, createdAt: a.createdAt, ...a.core },
      update: { createdAt: a.createdAt, ...a.core },
      select: { id: true },
    });

    await tx.athleteAddress.upsert({
      where: { athleteId: athlete.id },
      create: { athleteId: athlete.id, ...a.address },
      update: a.address,
    });
    await tx.athleteMedicalAndEmergency.upsert({
      where: { athleteId: a.athleteId },
      create: { athleteId: a.athleteId, ...a.medical },
      update: a.medical,
    });

    // Contacts have no natural key: replace them so re-runs never duplicate.
    await tx.athleteGuardian.deleteMany({ where: { athleteId: a.athleteId } });
    await tx.athleteEmergencyContact.deleteMany({
      where: { athleteId: athlete.id },
    });
    if (a.guardian) {
      await tx.athleteGuardian.create({
        data: { athleteId: a.athleteId, ...a.guardian },
      });
      await tx.athleteEmergencyContact.create({
        data: {
          athleteId: athlete.id,
          name: a.guardian.fullNames,
          phoneNumber: a.guardian.phoneNumber,
          relationship: a.guardian.relationship,
        },
      });
    }
  });
}

export async function seedAthletes(file = "data.csv") {
  const rows = readCsv<Row>(file);
  console.log(`   ${rows.length} rows in ${file}`);

  const athletes: ReturnType<typeof toAthlete>[] = [];
  const failed: { item: string; error: string }[] = [];
  for (const row of rows) {
    try {
      athletes.push(toAthlete(row));
    } catch (e) {
      failed.push({ item: row.id, error: (e as Error).message });
    }
  }

  failed.push(
    ...(await inChunks(athletes, CHUNK, upsertAthlete, (a) => a.athleteId)),
  );

  const noDob = athletes.filter((a) => a.core.age === null).length;
  console.log(
    `   ${athletes.length - failed.length} upserted, ${failed.length} failed` +
      (noDob ? `, ${noDob} without DOB → "Unassigned" batch` : ""),
  );
  for (const f of failed.slice(0, 10)) console.warn(`   ✗ ${f.item}: ${f.error}`);

  // The next athlete registered in the app must not reuse a seeded id.
  const highest = Math.max(0, ...athletes.map((a) => a.n));
  await syncAthleteSequence(highest);

  return failed.length;
}

/** Raises AthleteSequence to `atLeast`; never lowers it. */
export async function syncAthleteSequence(atLeast: number) {
  const seq = await db.athleteSequence.findUnique({ where: { id: 1 } });
  if (!seq) {
    await db.athleteSequence.create({ data: { id: 1, current: atLeast } });
  } else if (seq.current < atLeast) {
    await db.athleteSequence.update({
      where: { id: 1 },
      data: { current: atLeast },
    });
  }
  console.log(
    `   athlete sequence at ${Math.max(seq?.current ?? 0, atLeast)} (next: ${athleteIdFor(Math.max(seq?.current ?? 0, atLeast) + 1)})`,
  );
}
