import NotFound from "@/app/not-found";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import EditUserProfile from "@/Modules/Users/AthletesProfile/EditUserProfile/EditUserProfile";
interface pageProps {
  params: Promise<{ id: string }>;
}

export type FullAthleteData = Prisma.AthleteGetPayload<{
  include: {
    guardians: true;
    medical: true;
    address: true;
    emergencyContacts: true;
  };
}>;

const page = async ({ params }: pageProps) => {
  const { id } = await params;
  const athlete = await db.athlete.findUnique({
    where: {
      athleteId: id,
    },
    include: {
      guardians: true,
      medical: true,
      address: true,
      emergencyContacts: true,
    },
  });

  if (!athlete) return <NotFound />;
  return <EditUserProfile athlete={athlete} />;
};

export default page;
