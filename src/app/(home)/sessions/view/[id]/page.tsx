import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { GetAllTrainingSessionsByIdQuery } from "@/features/assessments/queries";
import ViewTrainingSession from "@/features/trainings/components/ViewTrainingSession";

export const metadata: Metadata = { title: "Session" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.training.findUnique(GetAllTrainingSessionsByIdQuery(id));
  if (!session || session.isArchived) notFound();
  return <ViewTrainingSession data={session} />;
}
