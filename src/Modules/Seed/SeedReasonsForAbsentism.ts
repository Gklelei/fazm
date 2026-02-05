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
  console.log("🚀 Starting Attendance Reasons seed...");

  try {
    await db.$transaction(
      Items.map((item) => {
        const customId = `id_${item.name}_${item.reason ?? "NONE"}`;
        return db.tRAINING_ATTENDANCE_REASONS.upsert({
          where: { id: customId },
          update: {},
          create: {
            id: customId,
            status: item.name,
            label: item.reason ?? "General",
          },
        });
      }),
    );

    console.log("Reasons for attendance seeded!");
  } catch (error) {
    console.error("❌ Seeding error details:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
