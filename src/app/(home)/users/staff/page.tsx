import { db } from "@/lib/prisma";
import { GetStaffQuery } from "@/Modules/Users/stafff/types";
import ViewAllStaff from "@/Modules/Users/stafff/Ui/ViewAllStaff";

interface Props {
  searchParams: Promise<{
    search?: string;
    page?: string;
    pageSize?: string;
    role?: string;
  }>;
}

const page = async ({ searchParams }: Props) => {
  const { page = "1", pageSize = "10", search = "", role } = await searchParams;

  const pageNum = parseInt(page) || 1;
  const PAGE_SIZE = parseInt(pageSize) || 10;

  const staff = await db.staff.findMany({
    ...GetStaffQuery({ search, role }),
    take: parseInt(pageSize),
    skip: (pageNum - 1) * PAGE_SIZE,
    orderBy: { createAt: "desc" },
  });

  const serializedData = {
    pages: [
      {
        items: JSON.parse(JSON.stringify(staff)),
        nextCursor: staff.length === PAGE_SIZE ? pageNum + 1 : null,
      },
    ],
    pageParams: [1],
  };
  return <ViewAllStaff initialData={serializedData} />;
};

export default page;
