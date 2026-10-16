import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetStaffByIdQuery } from "@/features/staff/queries";
import StaffViewPage from "@/features/staff/components/ViewStaffPage";
import type { Metadata } from "next";
import { logView } from "@/lib/audit-view";

export const metadata: Metadata = { title: "Staff Profile" };

interface Props {
  params: Promise<{ id: string }>;
}
const page = async ({ params }: Props) => {
  const { id } = await params;

  const user = await db.staff.findUnique(GetStaffByIdQuery(id));

  if (!user) return <NotFound />;
  await logView({
    resource: "Staff",
    recordId: user.staffId,
    details: `Opened ${user.fullNames}'s profile (${user.staffId})`,
  });
  return (
    <div>
      <StaffViewPage staff={user} />
    </div>
  );
};

export default page;
