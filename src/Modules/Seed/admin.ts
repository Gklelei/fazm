import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

/**
 * Creates the first SUPER_ADMIN login. Credentials come from the environment
 * so no password lives in the repo:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (min 8 chars), SEED_ADMIN_NAME
 */
export async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "System Admin";

  if (!email || !password) {
    console.log("   skipped — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    // Goes through better-auth so the password is hashed and an account row
    // is created exactly as for a normal sign-up.
    await auth.api.signUpEmail({ body: { email, password, name } });
  }

  // `role` is server-only (input: false), so it is set directly.
  await db.user.update({ where: { email }, data: { role: "SUPER_ADMIN" } });
  console.log(`   ${existing ? "existing" : "new"} SUPER_ADMIN: ${email}`);
}
