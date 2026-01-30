import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import AcademyPage from "@/Modules/academy/ui/AcademyPage";
import { getAcademyQuery } from "@/Modules/academy/Validation/Types";

const page = async () => {
  const academy = await db.academy.findMany(getAcademyQuery);
  if (!academy) return <NotFound />;
  return <AcademyPage />;
};

export default page;
