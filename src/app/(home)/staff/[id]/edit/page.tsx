import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canRunPayroll } from "@/lib/roles";
import { logView } from "@/lib/audit-view";
import { PageHeader } from "@/components/shared/PageHeader";
import { findStaff, staffFormValues } from "@/features/staff/queries/detail";
import { StaffForm } from "@/features/staff/components/StaffForm";

export const metadata: Metadata = { title: "Edit staff" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await findStaff(id);
  if (!staff) notFound();
  if (staff.isArchived) redirect(`/staff/${id}`);
  const session = await auth.api.getSession({ headers: await headers() });
  await logView({ resource: "Staff", recordId: staff.staffId, details: `Opened ${staff.fullNames}'s record for editing (${staff.staffId})` });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Edit ${staff.fullNames}`} description={staff.staffId} />
      <StaffForm
        staffId={staff.staffId}
        values={staffFormValues(staff, canRunPayroll(session?.user))}
        self={staff.userId === session?.user.id}
        canEditPay={canRunPayroll(session?.user)}
        canGrantPayroll={session?.user.role === "SUPER_ADMIN"}
      />
    </div>
  );
}
