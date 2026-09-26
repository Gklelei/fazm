import { db } from "@/lib/prisma";
import AcademyPage from "@/Modules/academy/ui/AcademyPage";
import { getAcademyQuery } from "@/Modules/academy/Validation/Types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academy Profile" };

const page = async () => {
  const academy = await db.academy.findFirst(getAcademyQuery);

  const isEditing = !!academy;

  return <AcademyPage isEditting={isEditing} academy={academy || null} />;
};

export default page;
