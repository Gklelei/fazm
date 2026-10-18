-- AlterTable
ALTER TABLE "academy" ADD COLUMN     "attendance_edit_days" INTEGER,
ADD COLUMN     "bank_details" TEXT,
ADD COLUMN     "default_plan_id" TEXT,
ADD COLUMN     "document_terms" TEXT,
ADD COLUMN     "email_invoices" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_overdue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_receipts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finance_report_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inactive_weeks" INTEGER NOT NULL DEFAULT 13,
ADD COLUMN     "invoice_due_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
ADD COLUMN     "kra_pin" TEXT,
ADD COLUMN     "late_fee_amount" DECIMAL(10,2),
ADD COLUMN     "late_fee_grace_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "log_retention_months" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "prorate_first_invoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receipt_prefix" TEXT NOT NULL DEFAULT 'FEES',
ADD COLUMN     "reply_to" TEXT,
ADD COLUMN     "required_documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sender_email" TEXT,
ADD COLUMN     "sender_name" TEXT,
ADD COLUMN     "session_minutes" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "session_timeout_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "signature_url" TEXT,
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_password" TEXT,
ADD COLUMN     "smtp_port" INTEGER,
ADD COLUMN     "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtp_user" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "late_fee_for_id" TEXT,
ADD COLUMN     "reminded_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_late_fee_for_id_key" ON "invoices"("late_fee_for_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_late_fee_for_id_fkey" FOREIGN KEY ("late_fee_for_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

