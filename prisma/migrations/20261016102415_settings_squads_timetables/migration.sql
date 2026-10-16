-- AlterTable
ALTER TABLE "batch_schedules" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "staffId" TEXT,
ADD COLUMN     "trainingLocationsId" TEXT;

-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "training_attendance_reasons" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "batch_schedules" ADD CONSTRAINT "batch_schedules_trainingLocationsId_fkey" FOREIGN KEY ("trainingLocationsId") REFERENCES "training_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_schedules" ADD CONSTRAINT "batch_schedules_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("staffId") ON DELETE SET NULL ON UPDATE CASCADE;
