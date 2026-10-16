import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  // No baseURL: in the browser better-auth uses the page's own address, so
  // any host or port works and no server-only env var reaches the client.
  // Types server-only user fields (e.g. `role`) on the client session
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, useSession } = authClient;
