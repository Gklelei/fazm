import "dotenv/config.js";
import { db } from "@/lib/prisma";

async function main() {
  console.log(process.env.DATABASE_URL);
  await db.athleteSequence.upsert({
    where: { id: 1 },
    create: { id: 1, current: 0 },
    update: { current: { increment: 1 } },
    select: { current: true },
  });
  console.log("✅ Athlete sequence initialized");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
