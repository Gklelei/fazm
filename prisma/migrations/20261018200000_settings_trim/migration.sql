-- AlterTable
ALTER TABLE "academy" DROP COLUMN "bank_details",
DROP COLUMN "log_retention_months",
DROP COLUMN "prorate_first_invoice",
DROP COLUMN "signature_url",
ALTER COLUMN "session_timeout_minutes" DROP NOT NULL,
ALTER COLUMN "session_timeout_minutes" DROP DEFAULT;


-- Idle sign-out starts off (today's behaviour)
UPDATE "academy" SET "session_timeout_minutes" = NULL;
