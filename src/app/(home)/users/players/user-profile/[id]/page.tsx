import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import AthleteProfile from "@/Modules/Users/AthletesProfile/AthleteProfile";
import { GetAthleteByIdQuery } from "@/Modules/Users/Types";

interface pageProps {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: pageProps) => {
  const { id } = await params;
  const athlete = await db.athlete.findUnique(GetAthleteByIdQuery(id));

  if (!athlete) {
    return <NotFound />;
  }
  return <AthleteProfile data={athlete} />;
};

export default page;
