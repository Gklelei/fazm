-- Password policy (2026-10): every existing account must set a new password
-- that meets the rule before it can use the system again.
ALTER TABLE "user" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
UPDATE "user" SET "mustChangePassword" = true;
