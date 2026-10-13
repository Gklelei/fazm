import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { passwordProblem } from "./password-policy";
import { db } from "./prisma";
import { SendMail } from "./mailtrap";
import { SendResetPasswordMailTemplate } from "@/features/mail/templates/ResetPasswordMail";
import { createAuditLog } from "./audit";

const PASSWORD_PATHS = new Set(["/sign-up/email", "/change-password", "/reset-password", "/set-password"]);

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    process.env.NODE_ENV === "production"
      ? (process.env.BETTER_AUTH_URL as string)
      : "http://localhost:3000",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
    requireEmailVerification: false,
    // A reset link proves the owner; the new password met the policy (hook
    // below), so the account no longer has to change it, and every other
    // signed-in device is signed out.
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user }) => {
      await db.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
      await createAuditLog({ action: "PASSWORD_RESET", resource: "User", userId: user.id });
    },
    sendResetPassword: async ({ url, user }) => {
      SendMail({
        to: [user.email],
        subject: "Reset Password",
        text: "Reset Password",
        html: SendResetPasswordMailTemplate({ resetLink: url }),
      });
    },
  },
  user: {
    // Accounts are removed by an admin (Staff), never self-deleted
    deleteUser: { enabled: false },
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        input: false,
        required: false,
        defaultValue: false,
      },
      role: {
        type: "string",
        // Never accept `role` from client-supplied request bodies (sign-up /
        // update-user). Role is only ever set server-side, e.g. in
        // CreateStaffAction via a direct DB update after account creation.
        input: false,
        required: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  session: {
    expiresIn: 30 * 60,
    updateAge: 5 * 60,
    freshAge: 5 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  hooks: {
    // The password policy is enforced here, so it applies to every way a
    // password is set: staff creation, the seeder, change and reset.
    before: createAuthMiddleware(async (ctx) => {
      if (!PASSWORD_PATHS.has(ctx.path)) return;
      const body = (ctx.body ?? {}) as { password?: string; newPassword?: string; currentPassword?: string };
      const next = body.newPassword ?? body.password ?? "";
      const problem = passwordProblem(next);
      if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      if (ctx.path === "/change-password" && body.currentPassword === next) {
        throw new APIError("BAD_REQUEST", { message: "Choose a password you haven't used here before." });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-password" || isAPIError(ctx.context.returned)) return;
      const userId = ctx.context.session?.user.id;
      if (!userId) return;
      await db.user.update({ where: { id: userId }, data: { mustChangePassword: false } });
      await createAuditLog({ action: "PASSWORD_CHANGE", resource: "User", userId });
    }),
  },
  databaseHooks: {
    session: {
      create: {
        // Archived staff can't sign in
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { isArchived: true },
          });
          if (!user || user.isArchived) return false;
        },
        after: async (session) => {
          await createAuditLog({
            action: "LOGIN",
            resource: "Session",
            details: "User signed in",
            userId: session.userId,
          });
        },
      },
      delete: {
        after: async (session) => {
          await createAuditLog({
            action: "LOGOUT",
            resource: "Session",
            details: "User signed out",
            userId: session.userId,
          });
        },
      },
    },
  },
  // Lets server actions / route handlers that call auth.api set cookies.
  // Must stay the last plugin.
  plugins: [nextCookies()],
});
