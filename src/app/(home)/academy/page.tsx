import { getCachedAcademy } from "@/lib/academy-cache";
import AcademyPage from "@/features/academy/components/AcademyPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academy Profile" };

const page = async () => {
  const academy = await getCachedAcademy();

  const isEditing = !!academy;

  return <AcademyPage isEditting={isEditing} academy={academy || null} />;
};

export default page;
