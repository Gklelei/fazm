// Who the fake `auth.api.getSession` says is signed in (see setup-int.ts).
type TestUser = { id: string; name: string; email: string; role: string };

let user: TestUser | null = null;

export const signInAs = (u: TestUser) => void (user = u);
export const signOut = () => void (user = null);

export const currentSession = () =>
  user
    ? {
        user: { ...user, emailVerified: true, mustChangePassword: false, isArchived: false },
        session: { id: "test-session", userId: user.id, token: "test", expiresAt: new Date(Date.now() + 3_600_000) },
      }
    : null;
