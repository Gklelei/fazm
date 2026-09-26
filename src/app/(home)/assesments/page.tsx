import { db } from "@/lib/prisma";
import { GetAssesmentMetricsQuery } from "@/Modules/Trainings/Assesments/Types";
import AssesmentMetrics from "@/Modules/Trainings/Assesments/ui/AssesmentMetrics";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assessments" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [metricsResponse, total] = await db.$transaction([
    db.assessmentTemplateSection.findMany({
      ...(GetAssesmentMetricsQuery as any),
      skip,
      take: limit,
      orderBy: { order: "asc" },
    }),
    db.assessmentTemplateSection.count(),
  ]);

  const metrics = metricsResponse as any;

  return (
    <div>
      <AssesmentMetrics
        data={metrics}
        page={page}
        limit={limit}
        total={total}
      />
    </div>
  );
}
