import { db } from "@/lib/prisma";
import { GetStaffQuery } from "@/Modules/Users/stafff/types";
import ViewAllStaff from "@/Modules/Users/stafff/Ui/ViewAllStaff";

const page = async () => {
  const staff = await db.staff.findMany({
    ...GetStaffQuery,
    orderBy: { createAt: "desc" },
  });

  return <ViewAllStaff data={staff} />;
};

export default page;
