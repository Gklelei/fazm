-- CreateEnum
CREATE TYPE "MetricKind" AS ENUM ('GRADE', 'MEASURE');

-- AlterTable
ALTER TABLE "AssessmentMetric" ADD COLUMN     "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "kind" "MetricKind" NOT NULL DEFAULT 'GRADE',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "AssessmentResponse" ADD COLUMN     "value" DECIMAL(10,2),
ALTER COLUMN "grade" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssessmentSectionNote" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "AssessmentSectionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentSectionNote_assessmentId_sectionId_key" ON "AssessmentSectionNote"("assessmentId", "sectionId");

-- AddForeignKey
ALTER TABLE "AssessmentSectionNote" ADD CONSTRAINT "AssessmentSectionNote_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSectionNote" ADD CONSTRAINT "AssessmentSectionNote_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentTemplateSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep today's order (alphabetical within each section)
UPDATE "AssessmentMetric" m
SET "position" = o.n
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "sectionId" ORDER BY label) - 1 AS n FROM "AssessmentMetric") o
WHERE o.id = m.id;
