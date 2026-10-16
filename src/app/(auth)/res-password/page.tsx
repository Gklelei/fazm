import type { Metadata } from "next";
import ResetPasswordForm, { ExpiredLink } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

// The emailed link goes through /api/auth/reset-password/<token>, which sends
// the browser here with ?token=... or, when the link is old or used, ?error=INVALID_TOKEN.
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (error || typeof token !== "string" || !token) return <ExpiredLink />;
  return <ResetPasswordForm token={token} />;
}
