import type { Metadata } from "next";
import { AuthBackground } from "@/components/shared/AuthBackground";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChangePasswordForm from "@/features/auth/components/ChangePasswordForm";

export const metadata: Metadata = { title: "Change password" };

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session) redirect("/sign-in");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <AuthBackground />
      <ChangePasswordForm
        name={session.user.name}
        required={!!session.user.mustChangePassword}
      />
    </div>
  );
}
