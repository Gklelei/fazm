-- Invoices and payments remember the programme and batch they were billed in,
-- so an athlete's transfer doesn't carry their past money into the new programme's reports.

-- AlterTable
ALTER TABLE "finance" ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "programme_id" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "programme_id" TEXT;

-- CreateIndex
CREATE INDEX "finance_programme_id_idx" ON "finance"("programme_id");

-- CreateIndex
CREATE INDEX "finance_batch_id_idx" ON "finance"("batch_id");

-- CreateIndex
CREATE INDEX "invoices_programme_id_idx" ON "invoices"("programme_id");

-- CreateIndex
CREATE INDEX "invoices_batch_id_idx" ON "invoices"("batch_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance" ADD CONSTRAINT "finance_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance" ADD CONSTRAINT "finance_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill from the athlete's batch today. Safe on prod: no athlete has changed
-- programme since programmes began (checked 2026-11-13), so today's batch is the billed one.
UPDATE "invoices" i
SET "programme_id" = b."programme_id", "batch_id" = b."id"
FROM "athlete" a JOIN "batches" b ON b."id" = a."batches_id"
WHERE a."athlete_id" = i."athleteId";

UPDATE "finance" f
SET "programme_id" = i."programme_id", "batch_id" = i."batch_id"
FROM "invoices" i
WHERE i."id" = f."invoiceId";

UPDATE "finance" f
SET "programme_id" = b."programme_id", "batch_id" = b."id"
FROM "athlete" a JOIN "batches" b ON b."id" = a."batches_id"
WHERE a."athlete_id" = f."athleteId" AND f."programme_id" IS NULL;

-- New invoices: a late fee follows the overdue invoice; anything else the athlete's batch now.
-- Stamps given by the code are kept.
CREATE FUNCTION stamp_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."programme_id" IS NULL THEN
    IF NEW."late_fee_for_id" IS NOT NULL THEN
      SELECT "programme_id", "batch_id" INTO NEW."programme_id", NEW."batch_id"
      FROM "invoices" WHERE "id" = NEW."late_fee_for_id";
    END IF;
    IF NEW."programme_id" IS NULL THEN
      SELECT b."programme_id", b."id" INTO NEW."programme_id", NEW."batch_id"
      FROM "athlete" a JOIN "batches" b ON b."id" = a."batches_id"
      WHERE a."athlete_id" = NEW."athleteId";
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER stamp_invoice BEFORE INSERT ON "invoices"
FOR EACH ROW EXECUTE FUNCTION stamp_invoice();

-- Payments: the invoice's stamp, or the athlete's batch when paid without one.
-- Moving a payment to another invoice stamps it again.
CREATE FUNCTION stamp_finance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."invoiceId" IS NOT DISTINCT FROM OLD."invoiceId" THEN
      RETURN NEW;
    END IF;
    NEW."programme_id" := NULL;
    NEW."batch_id" := NULL;
  END IF;
  IF NEW."programme_id" IS NULL THEN
    IF NEW."invoiceId" IS NOT NULL THEN
      SELECT "programme_id", "batch_id" INTO NEW."programme_id", NEW."batch_id"
      FROM "invoices" WHERE "id" = NEW."invoiceId";
    END IF;
    IF NEW."programme_id" IS NULL THEN
      SELECT b."programme_id", b."id" INTO NEW."programme_id", NEW."batch_id"
      FROM "athlete" a JOIN "batches" b ON b."id" = a."batches_id"
      WHERE a."athlete_id" = NEW."athleteId";
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER stamp_finance BEFORE INSERT OR UPDATE OF "invoiceId" ON "finance"
FOR EACH ROW EXECUTE FUNCTION stamp_finance();
