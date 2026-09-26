import CreateStaffForm from "@/Modules/Users/stafff/Ui/CreateStaffForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Staff" };

const page = () => {
  return <CreateStaffForm />;
};

export default page;
