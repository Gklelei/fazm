// import "dotenv/config";
// import { db } from "@/lib/prisma";

// async function seedCoaches() {
//   const ACADEMY_PREFIX = "STAFF-FFA";
//   console.log("Seeding coach...");
//   try {
//     await db.staff.create({
//       data: {
//         fullNames: "Fazam Coach",
//         role: "COACH",
//         staffId: `${ACADEMY_PREFIX}-${Math.floor(1000 + Math.random() * 9000)}`,
//       },
//     });
//     console.log("Coach Seeded succeifully");
//   } catch (error) {
//     console.log("failed to seed coach");
//     console.log(error);
//   }
// }

// seedCoaches();
