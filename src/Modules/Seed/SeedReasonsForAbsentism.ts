import "dotenv/config.js";
import { db } from "@/lib/prisma";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AbsentReason =
  | "SENT APOLOGY"
  | "WITHOUT APOLOGY"
  | "INJURY"
  | "SICKNESS"
  | "PERSONAL REASONS"
  | "TRAVEL"
  | "WORK COMMITMENT"
  | "OTHER";

interface Props {
  name: AttendanceStatus;
  reason?: AbsentReason;
}

const Items: Props[] = [
  { name: "PRESENT" },
  { name: "ABSENT", reason: "SENT APOLOGY" },
  { name: "ABSENT", reason: "WITHOUT APOLOGY" },
  { name: "ABSENT", reason: "INJURY" },
  { name: "ABSENT", reason: "SICKNESS" },
  { name: "ABSENT", reason: "PERSONAL REASONS" },
  { name: "ABSENT", reason: "TRAVEL" },
  { name: "ABSENT", reason: "WORK COMMITMENT" },
  { name: "ABSENT", reason: "OTHER" },
  { name: "LATE", reason: "TRAVEL" },
  { name: "EXCUSED", reason: "SENT APOLOGY" },
];

async function main() {
  const rows = Items.map((item) => {
    const id = `id_${item.name}_${item.reason ?? "NONE"}`;
    return {
      id,
      status: item.name,
      label: item.reason ?? "General",
    };
  });

  await db.tRAINING_ATTENDANCE_REASONS.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log("✅ Seeded attendance reasons");
}

main().finally(async () => {
  await db.$disconnect();
});
