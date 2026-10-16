import type { Metadata } from "next";
import { listStaff } from "@/features/staff/queries/list";
import { StaffList } from "@/features/staff/components/StaffList";

export const metadata: Metadata = { title: "Staff" };

export default async function Page() {
  return <StaffList initial={JSON.parse(JSON.stringify(await listStaff({})))} />;
}
