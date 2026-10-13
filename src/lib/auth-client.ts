import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "production"
      ? (process.env.BETTER_AUTH_URL as string)
      : "http://localhost:3000",
  // Types server-only user fields (e.g. `role`) on the client session
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
