import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetStaffByIdQuery } from "@/Modules/Users/stafff/types";
import StaffViewPage from "@/Modules/Users/stafff/Ui/ViewStaffPage";

interface Props {
  params: Promise<{ id: string }>;
}
const page = async ({ params }: Props) => {
  const { id } = await params;

  const user = await db.staff.findUnique(GetStaffByIdQuery(id));

  if (!user) return <NotFound />;
  return (
    <div>
      <StaffViewPage staff={user} />
    </div>
  );
};

export default page;
