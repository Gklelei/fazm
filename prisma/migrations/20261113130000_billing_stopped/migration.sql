-- When staff stopped an athlete's billing (no plan); the invoice form flags them
ALTER TABLE "athlete" ADD COLUMN "billing_stopped_at" TIMESTAMP(3);
