import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { academyDate, academyHHmm } from "@/lib/academy-time";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionForm } from "@/features/trainings/components/SessionForm";

export const metadata: Metadata = { title: "Edit session" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await db.training.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      note: true,
      date: true,
      duration: true,
      batchesId: true,
      trainingLocationsId: true,
      staffId: true,
      drillOrder: true,
      isArchived: true,
    },
  });
  if (!t || t.isArchived) notFound();
  const end = new Date(t.date.getTime() + t.duration * 60_000);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Edit session" description={t.name} />
      <SessionForm
        id={id}
        values={{
          date: academyDate(t.date),
          start: academyHHmm(t.date),
          end: academyHHmm(end),
          batch: t.batchesId,
          location: t.trainingLocationsId,
          coach: t.staffId,
          title: t.name,
          description: t.description,
          drills: t.drillOrder,
          note: t.note ?? "",
        }}
      />
    </div>
  );
}
