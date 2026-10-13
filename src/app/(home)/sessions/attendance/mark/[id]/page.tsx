import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { GetTrainingAthletesQuery } from "@/features/trainings/queries";
import MarkAttendance from "@/features/trainings/components/MarkAttendance";

export const metadata: Metadata = { title: "Take attendance" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const training = await db.training.findUnique(GetTrainingAthletesQuery(id));
  if (!training) notFound();
  return <MarkAttendance data={training} />;
}
