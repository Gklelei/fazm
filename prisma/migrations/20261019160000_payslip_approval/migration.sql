-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "status" "PAYROLL_STATUS" NOT NULL DEFAULT 'PROVISIONAL';


-- Payslips in months already approved are approved
UPDATE "payslips" p SET "status" = 'APPROVED', "approved_by_id" = r."approved_by_id", "approved_at" = r."approved_at"
FROM "payroll_runs" r WHERE p."run_id" = r."id" AND r."status" <> 'PROVISIONAL';
