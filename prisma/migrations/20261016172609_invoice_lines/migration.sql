-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmount" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "subscriptionPlanId" TEXT,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_position_idx" ON "invoice_lines"("invoiceId", "position");

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing invoice becomes a one-line invoice with the same total
INSERT INTO "invoice_lines" ("id", "invoiceId", "position", "description", "quantity", "unitAmount", "amount", "subscriptionPlanId")
SELECT
  gen_random_uuid()::text,
  i."id",
  0,
  COALESCE(NULLIF(TRIM(i."description"), ''), sp."name", INITCAP(REPLACE(i."type"::text, '_', ' '))),
  GREATEST(i."quantity", 1),
  CASE WHEN i."quantity" > 1 THEN i."unitAmount" ELSE i."amountDue" END,
  i."amountDue",
  i."subscriptionPlanId"
FROM "invoices" i
LEFT JOIN "subscription_plans" sp ON sp."id" = i."subscriptionPlanId";
