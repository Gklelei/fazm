import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import "dotenv/config.js";

const SUPERADMIN = {
  name: "SYSTEM ADMIN",
  email: "leleigideon97@gmail.com",
  password: "@devAdmin1234567890",
};

console.log(process.env.DATABASE_URL);
export async function SEEDSUPERADMIN() {
  try {
    const { user, token } = await auth.api.signInEmail({
      body: {
        email: SUPERADMIN.email,
        password: SUPERADMIN.password,
      },
    });

    if (user && token) {
      await db.user.create({
        data: {
          email: SUPERADMIN.email,
          name: SUPERADMIN.name,
          role: "SUPER_ADMIN",
        },
      });
    }
  } catch (error) {
    console.log(error);
  } finally {
    await db.$disconnect();
  }
}

SEEDSUPERADMIN();
