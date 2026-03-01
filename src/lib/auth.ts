import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./prisma";
import SendEmail from "@/Modules/Mail/SendEmail";
import { SendMail } from "./mailtrap";
import { SendResetPasswordMailTemplate } from "@/Modules/Mail/Templates/SendResetPasswordMail";

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
    sendResetPassword: async ({ url, user }) => {
      SendMail({
        to: [user.email],
        subject: "Reset Password",
        text: "Reset Password",
        html: SendResetPasswordMailTemplate({resetLink:url}),
      })
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
    updateAge: 5 * 60,
    freshAge: 5 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
