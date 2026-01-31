import { db } from "@/lib/prisma";
import AthletesData from "@/Modules/Users/AthletesOnboarding/client/Components/AthletesData";

const page = async () => {
  const athlete = await db.athlete.findMany();
  console.log(athlete[0]);
  return <AthletesData />;
};

export default page;
