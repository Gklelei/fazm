import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetTrainingById } from "@/Modules/Trainings/Assesments/Types";
import EditTrainingSessions from "@/Modules/Trainings/ui/EditTrainingSessions";

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;

  const session = await db.training.findUnique(GetTrainingById(id));

  if (!session) return <NotFound />;
  return (
    <div>
      <EditTrainingSessions training={session} />
    </div>
  );
};

export default page;
