import type { Metadata } from "next";
import Image from "next/image";
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
      <Image src="/login-hero.png" alt="" fill className="object-cover object-center" priority />
      <div className="absolute inset-0 bg-brand-navy/85" />
      <ChangePasswordForm
        name={session.user.name}
        required={!!session.user.mustChangePassword}
      />
    </div>
  );
}
