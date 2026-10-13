import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetStaffByIdQuery } from "@/features/staff/queries";
import CreateStaffForm from "@/features/staff/components/CreateStaffForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Staff" };

interface Props {
  params: Promise<{ id: string }>;
}
const page = async ({ params }: Props) => {
  const { id } = await params;

  const user = await db.staff.findUnique(GetStaffByIdQuery(id));
  if (!user) return <NotFound />;
  return <CreateStaffForm user={user} />;
};

export default page;
