import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

/** The academy owner's account. Override with SEED_ADMIN_EMAIL if needed. */
const SUPER_ADMIN_EMAIL = "leleigideon97@gmail.com";

/**
 * Creates the SUPER_ADMIN login (self sign-up is closed, so this is how the
 * first account comes to exist). The password is never in the repo:
 *   SEED_ADMIN_PASSWORD  required, at least 8 characters
 *   SEED_ADMIN_NAME      optional, defaults to "System Admin"
 * If the account already exists it is only promoted to SUPER_ADMIN; its
 * password is left unchanged.
 */
export async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || SUPER_ADMIN_EMAIL).trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "System Admin";

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    if (!password || password.length < 8) {
      console.log(`   skipped — set SEED_ADMIN_PASSWORD (8+ characters) to create ${email}`);
      return;
    }
    // Server-side call: hashes the password and creates the account row
    // exactly as better-auth would (the public sign-up route is closed).
    await auth.api.signUpEmail({ body: { email, password, name } });
  }

  // `role` is server-only (input: false), so it is set directly.
  await db.user.update({ where: { email }, data: { role: "SUPER_ADMIN" } });
  console.log(`   ${existing ? "existing account promoted" : "created"}: SUPER_ADMIN ${email}`);
}
