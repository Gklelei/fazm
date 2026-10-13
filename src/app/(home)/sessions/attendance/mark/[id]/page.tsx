import { db } from "@/lib/prisma";
import { GetTrainingAthletesQuery } from "@/features/trainings/queries";
import MarkAttendance from "@/features/trainings/components/MarkAttendance";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mark Attendance" };

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
