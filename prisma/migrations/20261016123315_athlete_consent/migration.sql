-- CreateEnum
CREATE TYPE "CONSENT_METHOD" AS ENUM ('IN_PERSON', 'SIGNED_FORM');

-- CreateTable
CREATE TABLE "athlete_consent" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "dataUse" BOOLEAN NOT NULL,
    "emergencyTreatment" BOOLEAN NOT NULL,
    "photos" BOOLEAN NOT NULL,
    "givenByName" TEXT NOT NULL,
    "givenByRelationship" TEXT NOT NULL,
    "method" "CONSENT_METHOD" NOT NULL,
    "formUrl" TEXT,
    "givenAt" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "athlete_consent_athleteId_createdAt_idx" ON "athlete_consent"("athleteId", "createdAt");

-- AddForeignKey
ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_consent" ADD CONSTRAINT "athlete_consent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
