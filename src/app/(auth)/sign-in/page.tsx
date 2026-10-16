import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeNext } from "@/features/auth/lib/safe-next";
import SignInForm from "@/features/auth/components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(safeNext(next));
  return <SignInForm next={safeNext(next)} passwordReset={reset === "done"} />;
}
