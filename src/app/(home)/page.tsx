import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ROLES } from "@/generated/prisma/enums";
import { Dashboard } from "@/features/dashboard/components/Dashboard";
import { getDashboard } from "@/features/dashboard/queries/get-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const role = (session.user.role as ROLES | null) ?? null;
  const data = await getDashboard(session.user.id, role);

  return <Dashboard data={data} name={session.user.name} />;
}
