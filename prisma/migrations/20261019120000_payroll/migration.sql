-- CreateEnum
CREATE TYPE "PAY_BASIS" AS ENUM ('MONTHLY', 'PER_SESSION');

-- CreateEnum
CREATE TYPE "ADVANCE_STATUS" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PAYROLL_STATUS" AS ENUM ('PROVISIONAL', 'APPROVED', 'PAID');

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "pay_account" TEXT,
ADD COLUMN     "pay_basis" "PAY_BASIS",
ADD COLUMN     "pay_method" TEXT,
ADD COLUMN     "session_rate" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bands" JSONB,
    "relief" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minimum" DECIMAL(10,2),
    "maximum" DECIMAL(10,2),
    "before_tax" BOOLEAN NOT NULL DEFAULT false,
    "employer_percent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "statutory" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "staff_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_advances" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "months" INTEGER NOT NULL DEFAULT 1,
    "status" "ADVANCE_STATUS" NOT NULL DEFAULT 'PENDING',
    "recorded_by_id" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "PAYROLL_STATUS" NOT NULL DEFAULT 'PROVISIONAL',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "expense_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "basis" "PAY_BASIS" NOT NULL,
    "sessions" INTEGER,
    "basic" DECIMAL(12,2) NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "employer" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lines" JSONB NOT NULL,
    "adjustments" JSONB NOT NULL DEFAULT '{}',
    "over_cap" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_recoveries" (
    "id" TEXT NOT NULL,
    "advance_id" TEXT NOT NULL,
    "payslip_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "advance_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deductions_statutory_key" ON "payroll_deductions"("statutory");

-- CreateIndex
CREATE INDEX "salary_advances_staff_id_idx" ON "salary_advances"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_month_key" ON "payroll_runs"("month");

-- CreateIndex
CREATE INDEX "payslips_staff_id_idx" ON "payslips"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_run_id_staff_id_key" ON "payslips"("run_id", "staff_id");

-- CreateIndex
CREATE INDEX "advance_recoveries_advance_id_idx" ON "advance_recoveries"("advance_id");

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_recoveries" ADD CONSTRAINT "advance_recoveries_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "salary_advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_recoveries" ADD CONSTRAINT "advance_recoveries_payslip_id_fkey" FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Kenyan statutory presets, off until the academy sets them up (rates as of 2026; check KRA and NSSF)
INSERT INTO "payroll_deductions" ("id", "name", "kind", "value", "bands", "relief", "minimum", "maximum", "before_tax", "employer_percent", "statutory", "enabled", "position", "updated_at") VALUES
  ('ded_nssf', 'NSSF', 'PERCENT_GROSS', 6, NULL, 0, NULL, 6480, true, 100, 'NSSF', false, 0, now()),
  ('ded_shif', 'SHIF', 'PERCENT_GROSS', 2.75, NULL, 0, 300, NULL, true, 0, 'SHIF', false, 1, now()),
  ('ded_housing', 'Housing Levy', 'PERCENT_GROSS', 1.5, NULL, 0, NULL, NULL, true, 100, 'HOUSING_LEVY', false, 2, now()),
  ('ded_paye', 'PAYE', 'BANDED', 0, '[{"upTo":24000,"rate":10},{"upTo":32333,"rate":25},{"upTo":500000,"rate":30},{"upTo":800000,"rate":32.5},{"upTo":null,"rate":35}]', 2400, NULL, NULL, false, 0, 'PAYE', false, 3, now());

-- Staff with a salary already are paid monthly
UPDATE "staff" SET "pay_basis" = 'MONTHLY' WHERE "salary" IS NOT NULL AND "salary" > 0;
