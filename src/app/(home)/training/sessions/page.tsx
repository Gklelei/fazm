import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetAllTrainingSessionsQuery } from "@/Modules/Trainings/Assesments/Types";
import ViewTrainingSessions from "@/Modules/Trainings/ui/ViewTrainingSessions";

const Page = async () => {
  const trainings = await db.training.findMany(GetAllTrainingSessionsQuery);

  if (!trainings) return <NotFound />;
  return <ViewTrainingSessions data={trainings} />;
};

export default Page;
