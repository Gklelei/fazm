import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import {
  AssesmentAthleteQuery,
  GetAssesmentMetricsQuery,
} from "@/Modules/Trainings/Assesments/Types";
import CreateAssesment from "@/Modules/Trainings/Assesments/ui/CreateAssesment";

interface Props {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: Props) => {
  const { id } = await params;
  const [metrics, athletes] = await Promise.all([
    await db.assessmentTemplateSection.findMany(GetAssesmentMetricsQuery),
    await db.training.findUnique(AssesmentAthleteQuery(id)),
  ]);

  if (!athletes) return <NotFound />;
  return <CreateAssesment athletes={athletes} metrics={metrics} />;
};

export default page;
