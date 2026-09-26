import SendEmail from "@/Modules/Mail/SendEmail";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Send Email" };

const page = () => {
  return <SendEmail />;
};

export default page;
