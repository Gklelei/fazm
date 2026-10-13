import { db } from "@/lib/prisma";
import type { AttendanceStatus } from "@/generated/prisma/enums";

/**
 * Age-group batches. Fixed ids keep re-runs idempotent and let the athlete
 * seeder assign by id. `maxAge` is exclusive (U9 = under 9).
 */
export const BATCHES = [
  { id: "seed_batch_u7", name: "U7", maxAge: 7 },
  { id: "seed_batch_u9", name: "U9", maxAge: 9 },
  { id: "seed_batch_u11", name: "U11", maxAge: 11 },
  { id: "seed_batch_u13", name: "U13", maxAge: 13 },
  { id: "seed_batch_u15", name: "U15", maxAge: 15 },
  { id: "seed_batch_u17", name: "U17", maxAge: 17 },
  { id: "seed_batch_senior", name: "Senior", maxAge: Infinity },
] as const;

/** For athletes with no usable date of birth — re-assign them in the app. */
export const UNASSIGNED_BATCH = {
  id: "seed_batch_unassigned",
  name: "Unassigned",
};

export function batchIdForAge(age: number | null) {
  if (age === null) return UNASSIGNED_BATCH.id;
  return BATCHES.find((b) => age < b.maxAge)!.id;
}

const ATTENDANCE_REASONS: { status: AttendanceStatus; label?: string }[] = [
  { status: "PRESENT" },
  { status: "ABSENT", label: "SENT APOLOGY" },
  { status: "ABSENT", label: "WITHOUT APOLOGY" },
  { status: "ABSENT", label: "INJURY" },
  { status: "ABSENT", label: "SICKNESS" },
  { status: "ABSENT", label: "PERSONAL REASONS" },
  { status: "ABSENT", label: "TRAVEL" },
  { status: "ABSENT", label: "WORK COMMITMENT" },
  { status: "ABSENT", label: "OTHER" },
  { status: "LATE", label: "TRAVEL" },
  { status: "EXCUSED", label: "SENT APOLOGY" },
];

export async function seedAttendanceReasons() {
  const { count } = await db.tRAINING_ATTENDANCE_REASONS.createMany({
    // Same ids as the old SeedReasonsForAbsentism, so existing rows are kept
    data: ATTENDANCE_REASONS.map((r) => ({
      id: `id_${r.status}_${r.label ?? "NONE"}`,
      status: r.status,
      label: r.label ?? "General",
    })),
    skipDuplicates: true,
  });
  console.log(`   ${count} new, ${ATTENDANCE_REASONS.length - count} existing`);
}

export async function seedBatches() {
  for (const b of [...BATCHES, UNASSIGNED_BATCH]) {
    const description =
      b.id === UNASSIGNED_BATCH.id
        ? "Athletes imported without a date of birth"
        : `${b.name} age group`;
    await db.batches.upsert({
      where: { id: b.id },
      create: { id: b.id, name: b.name, description },
      update: {}, // never overwrite edits made in the app
    });
  }
  console.log(`   ${BATCHES.length + 1} batches ready`);
}

export async function seedAcademy() {
  // The app reads a single academy row; only create it when missing.
  if (await db.academy.findFirst({ select: { id: true } })) {
    console.log("   academy profile exists — left unchanged");
    return;
  }
  await db.academy.create({
    data: {
      academyName: "Fazam Football Academy",
      contactEmail: "info@fazamfootball.org",
      address: "Eastleigh, Nairobi, Kenya",
      logoUrl: "/Fazam Logo Half.jpg",
      primaryColor: "fazam",
      // Fill in the real payment details under Settings → Academy
      paymentMathod: "",
      paymentMethodType: "",
    },
  });
  console.log("   academy profile created");
}
