import type { Metadata } from "next";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <ForgotPasswordForm email={typeof email === "string" ? email.slice(0, 254) : ""} />;
}
