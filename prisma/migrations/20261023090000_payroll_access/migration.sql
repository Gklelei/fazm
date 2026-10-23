-- AlterTable
ALTER TABLE "user" ADD COLUMN     "payrollAccess" BOOLEAN NOT NULL DEFAULT false;


-- One payroll person at most, whatever writes it
CREATE UNIQUE INDEX "user_one_payroll_person" ON "user" ("payrollAccess") WHERE "payrollAccess";
