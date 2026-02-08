import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedAthletes } from "./SeedAthletes";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting Seeding Process...");

  await seedAthletes(prisma);

  console.log("🏁 Seeding Finished.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
