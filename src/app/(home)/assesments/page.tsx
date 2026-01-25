import { db } from "@/lib/prisma";
import { GetAssesmentMetricsQuery } from "@/Modules/Trainings/Assesments/Types";
import AssesmentMetrics from "@/Modules/Trainings/Assesments/ui/AssesmentMetrics";

const page = async () => {
  const metrics = await db.assessmentTemplateSection.findMany(
    GetAssesmentMetricsQuery,
  );
  return (
    <div>
      <AssesmentMetrics data={metrics} />
    </div>
  );
};

export default page;
