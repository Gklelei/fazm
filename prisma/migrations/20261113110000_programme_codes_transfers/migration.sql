-- Per-programme athlete IDs (ATH/FFA/<code>/<number>) and the record of transfers between programmes.
-- Codes are set later (Settings, or the one-off rename); until a programme has one, registration
-- keeps issuing ATH-FFA-### from athlete_sequence.

-- AlterTable
ALTER TABLE "programmes" ADD COLUMN     "athlete_counter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "code" TEXT;

-- Capitals only, so a link's dashes turn back into the ID's slashes without doubt
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_code_letters" CHECK ("code" ~ '^[A-Z]{1,3}$');

-- CreateTable
CREATE TABLE "athlete_transfers" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "from_batch_id" TEXT NOT NULL,
    "to_batch_id" TEXT NOT NULL,
    "from_programme_id" TEXT NOT NULL,
    "to_programme_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "athlete_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "athlete_transfers_athlete_id_date_idx" ON "athlete_transfers"("athlete_id", "date");

-- CreateIndex
CREATE INDEX "athlete_transfers_from_programme_id_date_idx" ON "athlete_transfers"("from_programme_id", "date");

-- CreateIndex
CREATE INDEX "athlete_transfers_to_programme_id_date_idx" ON "athlete_transfers"("to_programme_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "programmes_code_key" ON "programmes"("code");

-- AddForeignKey
ALTER TABLE "athlete_transfers" ADD CONSTRAINT "athlete_transfers_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_transfers" ADD CONSTRAINT "athlete_transfers_from_batch_id_fkey" FOREIGN KEY ("from_batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_transfers" ADD CONSTRAINT "athlete_transfers_to_batch_id_fkey" FOREIGN KEY ("to_batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_transfers" ADD CONSTRAINT "athlete_transfers_from_programme_id_fkey" FOREIGN KEY ("from_programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_transfers" ADD CONSTRAINT "athlete_transfers_to_programme_id_fkey" FOREIGN KEY ("to_programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
