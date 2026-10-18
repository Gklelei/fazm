-- AlterTable
ALTER TABLE "athlete" ADD COLUMN     "family_id" TEXT;

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "athlete_family_id_idx" ON "athlete"("family_id");

-- AddForeignKey
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

