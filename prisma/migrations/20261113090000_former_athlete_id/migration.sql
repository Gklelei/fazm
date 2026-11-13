-- The athlete's ID before per-programme IDs; filled by the one-off rename
ALTER TABLE "athlete" ADD COLUMN "former_athlete_id" TEXT;

CREATE UNIQUE INDEX "athlete_former_athlete_id_key" ON "athlete"("former_athlete_id");
