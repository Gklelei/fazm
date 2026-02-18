import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./prisma";
import { toast } from "sonner";

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
    autoSignIn: false,
    requireEmailVerification: false,
    sendResetPassword: async ({ token, url, user }) => {
      console.log({ token, url, user });
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      toast.success(`Password for user ${user.email} has been reset.`);
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      role: {
        type: "string",
        input: true,
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
    freshAge: 30 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});
