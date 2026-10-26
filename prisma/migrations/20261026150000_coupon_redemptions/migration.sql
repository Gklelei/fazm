-- Coupons redesigned: a coupon lasts once, for N fees invoices, or always; giving one is a
-- redemption (uses are counted from those, not a counter); each discount on an invoice is its
-- own line with the terms it was worked out from. Existing data carries over: totals stay as
-- they are.

-- 1. New types, the coupon's duration, the new tables
CREATE TYPE "CouponDuration" AS ENUM ('ONCE', 'INVOICES', 'ALWAYS');
CREATE TYPE "RedemptionStatus" AS ENUM ('ACTIVE', 'ENDED', 'REMOVED');
CREATE TYPE "InvoiceDiscountKind" AS ENUM ('COUPON', 'SIBLING', 'OTHER');

ALTER TABLE "coupons" ADD COLUMN "duration" "CouponDuration" NOT NULL DEFAULT 'ONCE',
ADD COLUMN "duration_count" INTEGER;
-- A repeating coupon discounted every fees invoice: it lasts always
UPDATE "coupons" SET "duration" = 'ALWAYS' WHERE "interval" = 'REPEATING';

CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "invoices_left" INTEGER,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "given_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "removed_by_id" TEXT,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_discounts" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "kind" "InvoiceDiscountKind" NOT NULL,
    "redemption_id" TEXT,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "plan_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_discounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coupon_redemptions_athlete_id_status_idx" ON "coupon_redemptions"("athlete_id", "status");
CREATE INDEX "coupon_redemptions_coupon_id_status_idx" ON "coupon_redemptions"("coupon_id", "status");
CREATE INDEX "invoice_discounts_invoice_id_idx" ON "invoice_discounts"("invoice_id");
CREATE INDEX "invoice_discounts_redemption_id_idx" ON "invoice_discounts"("redemption_id");

ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_discounts" ADD CONSTRAINT "invoice_discounts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_discounts" ADD CONSTRAINT "invoice_discounts_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "coupon_redemptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. The data
-- A coupon on a fee plan: given to the athlete, every fees invoice (still on while the plan is)
INSERT INTO "coupon_redemptions" ("id", "coupon_id", "athlete_id", "invoices_left", "status", "created_at", "ended_at")
SELECT 'mig-plan-' || s."id", s."couponId", s."athleteId", NULL,
       CASE WHEN s."status" = 'ACTIVE' THEN 'ACTIVE'::"RedemptionStatus" ELSE 'ENDED'::"RedemptionStatus" END,
       s."updatedAt", CASE WHEN s."status" = 'ACTIVE' THEN NULL ELSE s."updatedAt" END
FROM "athlete_subscriptions" s
WHERE s."couponId" IS NOT NULL;

-- A one-time coupon on an invoice: given for that invoice (no longer a use if it was canceled)
INSERT INTO "coupon_redemptions" ("id", "coupon_id", "athlete_id", "invoice_id", "invoices_left", "status", "created_at", "ended_at", "removed_at")
SELECT 'mig-inv-' || i."id", i."couponId", i."athleteId", i."id", 0,
       CASE WHEN i."status" = 'CANCELED' THEN 'REMOVED'::"RedemptionStatus" ELSE 'ENDED'::"RedemptionStatus" END,
       i."createdAt", i."createdAt", CASE WHEN i."status" = 'CANCELED' THEN i."updatedAt" END
FROM "invoices" i
JOIN "coupons" c ON c."id" = i."couponId"
WHERE c."interval" = 'ONCE';

-- Each discounted invoice: its discount as a line, the same amount
INSERT INTO "invoice_discounts" ("id", "invoice_id", "kind", "redemption_id", "label", "amount", "discount_type", "value", "plan_ids", "created_at")
SELECT 'mig-' || i."id", i."id", 'COUPON',
       CASE WHEN c."interval" = 'ONCE' THEN 'mig-inv-' || i."id"
            ELSE (SELECT 'mig-plan-' || s."id" FROM "athlete_subscriptions" s
                  WHERE s."couponId" = c."id" AND s."athleteId" = i."athleteId" ORDER BY s."updatedAt" DESC LIMIT 1) END,
       c."name" || ' (' || CASE WHEN c."discount_type" = 'PERCENTAGE' THEN (c."value"::float8)::text || '%'
                                ELSE 'Ksh ' || to_char(c."value", 'FM999,999,990') END || ')',
       i."discount", c."discount_type", c."value",
       ARRAY(SELECT cp."B" FROM "_CouponPlans" cp WHERE cp."A" = c."id"),
       i."createdAt"
FROM "invoices" i
JOIN "coupons" c ON c."id" = i."couponId"
WHERE COALESCE(i."discount", 0) > 0;

INSERT INTO "invoice_discounts" ("id", "invoice_id", "kind", "label", "amount", "discount_type", "value", "plan_ids", "created_at")
SELECT 'mig-' || i."id", i."id",
       CASE WHEN i."sibling_discount" THEN 'SIBLING'::"InvoiceDiscountKind" ELSE 'OTHER'::"InvoiceDiscountKind" END,
       CASE WHEN i."sibling_discount" THEN 'Sibling discount' ELSE 'Discount' END,
       i."discount", 'FIXED_AMOUNT', i."discount", '{}', i."createdAt"
FROM "invoices" i
WHERE i."couponId" IS NULL AND COALESCE(i."discount", 0) > 0;

-- 3. What the new tables replace
ALTER TABLE "athlete_subscriptions" DROP CONSTRAINT "athlete_subscriptions_couponId_fkey";
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_couponId_fkey";
ALTER TABLE "athlete_subscriptions" DROP COLUMN "couponId";
ALTER TABLE "invoices" DROP COLUMN "couponId",
DROP COLUMN "sibling_discount";
ALTER TABLE "coupons" DROP COLUMN "interval",
DROP COLUMN "times_used";
DROP TYPE "CouponInterval";
