-- AlterTable
ALTER TABLE "academy" ADD COLUMN     "sibling_discount_type" TEXT,
ADD COLUMN     "sibling_discount_value" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "sibling_discount" BOOLEAN NOT NULL DEFAULT false;

