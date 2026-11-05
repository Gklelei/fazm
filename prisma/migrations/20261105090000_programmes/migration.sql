-- Programmes (Boys, Girls, Elite) above batches. Every existing batch starts under Boys;
-- the admin moves batches in Settings. Fee plans and expenses may belong to one programme.

CREATE TABLE "programmes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

INSERT INTO "programmes" ("id", "name", "sort_order", "updated_at") VALUES
    ('prog_boys', 'Boys', 1, CURRENT_TIMESTAMP),
    ('prog_girls', 'Girls', 2, CURRENT_TIMESTAMP),
    ('prog_elite', 'Elite', 3, CURRENT_TIMESTAMP);

ALTER TABLE "batches" ADD COLUMN "programme_id" TEXT;
UPDATE "batches" SET "programme_id" = 'prog_boys';
ALTER TABLE "batches" ALTER COLUMN "programme_id" SET NOT NULL;

ALTER TABLE "expenses" ADD COLUMN "programme_id" TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN "programme_id" TEXT;

CREATE INDEX "batches_programme_id_idx" ON "batches"("programme_id");

ALTER TABLE "batches" ADD CONSTRAINT "batches_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
