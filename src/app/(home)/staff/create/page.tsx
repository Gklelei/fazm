import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { canRunPayroll } from "@/lib/roles";
import { PageHeader } from "@/components/shared/PageHeader";
import { StaffForm } from "@/features/staff/components/StaffForm";

export const metadata: Metadata = { title: "Add staff" };

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Add staff" />
      <StaffForm canEditPay={canRunPayroll(session?.user)} canGrantPayroll={session?.user.role === "SUPER_ADMIN"} />
    </div>
  );
}
