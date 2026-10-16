-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT "staff_userId_fkey";

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergency_name" TEXT,
ADD COLUMN     "emergency_phone" TEXT,
ADD COLUMN     "emergency_relationship" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "job_title" TEXT,
ADD COLUMN     "kra_pin" TEXT,
ADD COLUMN     "national_id" TEXT,
ADD COLUMN     "nssf_number" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "salary" DECIMAL(10,2),
ADD COLUMN     "shif_number" TEXT,
ADD COLUMN     "start_date" DATE,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "staff_documents" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoachBatches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoachBatches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "staff_documents_staffId_idx" ON "staff_documents"("staffId");

-- CreateIndex
CREATE INDEX "_CoachBatches_B_index" ON "_CoachBatches"("B");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_documents" ADD CONSTRAINT "staff_documents_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoachBatches" ADD CONSTRAINT "_CoachBatches_A_fkey" FOREIGN KEY ("A") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoachBatches" ADD CONSTRAINT "_CoachBatches_B_fkey" FOREIGN KEY ("B") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: contact email, photo and archived state come from each staff member's login
UPDATE "staff" s
SET "email" = u."email",
    "photo" = NULLIF(u."image", ''),
    "isArchived" = u."isArchived"
FROM "user" u
WHERE u."id" = s."userId";

-- Backfill: coaches on a batch's timetable coach that batch
INSERT INTO "_CoachBatches" ("A", "B")
SELECT DISTINCT bs."batchId", s."id"
FROM "batch_schedules" bs
JOIN "staff" s ON s."staffId" = bs."staffId"
WHERE bs."staffId" IS NOT NULL
ON CONFLICT DO NOTHING;
