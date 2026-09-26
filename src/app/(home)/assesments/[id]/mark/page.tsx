import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import CreateAssesment from "@/Modules/Trainings/Assesments/ui/CreateAssesment";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mark Assessment" };

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id: trainingId } = await params;

  const [metrics, training, existing] = await Promise.all([
    db.assessmentTemplateSection.findMany({
      where: { isArchived: false },
      orderBy: { order: "asc" },
      include: {
        metrics: { where: { isArchived: false }, orderBy: { label: "asc" } },
      },
    }),
    db.training.findUnique({
      where: { id: trainingId },
      include: {
        athletes: true,
        coach: { select: { fullNames: true } },
      },
    }),
    db.assessment.findMany({
      where: { trainingId },
      include: { responses: true },
    }),
  ]);

  if (!training) return <NotFound />;

  // Build edit map: athleteId -> { metricId -> {grade, comment} }
  const existingByAthlete: Record<
    string,
    {
      assessmentId: string;
      comment: string | null;
      responses: Record<string, { grade: string }>;
    }
  > = {};

  for (const a of existing) {
    existingByAthlete[a.athleteId] = {
      assessmentId: a.id,
      comment: a.comment,
      responses: Object.fromEntries(
        a.responses.map((r) => [
          r.metricId,
          {
            grade:
              r.grade === "BELOW_STANDARD"
                ? "1"
                : r.grade === "NEEDS_WORK"
                  ? "2"
                  : r.grade === "GOOD"
                    ? "3"
                    : r.grade === "VERY_GOOD"
                      ? "4"
                      : "5",
          },
        ]),
      ),
    };
  }

  return (
    <CreateAssesment
      trainingId={training.id}
      trainingName={training.name}
      trainingDate={new Date(training.date).toLocaleDateString()}
      coachId={training.staffId}
      coachName={training.coach?.fullNames ?? "Coach"}
      athletes={training.athletes}
      metrics={metrics}
      existingByAthlete={existingByAthlete}
    />
  );
};

export default page;
