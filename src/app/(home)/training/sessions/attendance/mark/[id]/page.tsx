import { db } from "@/lib/prisma";
import { GetTrainingAthletesQuery } from "@/Modules/Trainings/Types";
import MarkAttendance from "@/Modules/Trainings/ui/MarkAttendance";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: PageProps) => {
  const { id } = await params;
  const training = await db.training.findUnique(GetTrainingAthletesQuery(id));

  if (!training) notFound();

  return <MarkAttendance data={training} trainingId={id} />;
};

export default page;
