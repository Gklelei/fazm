import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetAllTrainingSessionsByIdQuery } from "@/Modules/Trainings/Assesments/Types";
import ViewTrainingSession from "@/Modules/Trainings/ui/ViewTrainingSession";

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;

  const [session, present, total] = await Promise.all([
    await db.training.findUnique(GetAllTrainingSessionsByIdQuery(id)),
    await db.attendance.count({
      where: {
        trainingId: id,
        status: "PRESENT",
        training: {
          isArchived: false,
        },
      },
    }),
    await db.training.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            athletes: {
              where: {
                isArchived: false,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!session) return <NotFound />;
  return (
    <ViewTrainingSession
      data={session}
      count={total?._count.athletes || 0}
      present={present}
    />
  );
};

export default page;
