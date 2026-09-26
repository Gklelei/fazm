import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetStaffByIdQuery } from "@/Modules/Users/stafff/types";
import CreateStaffForm from "@/Modules/Users/stafff/Ui/CreateStaffForm";
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
