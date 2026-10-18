-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "once_per_athlete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_CouponPlans" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CouponPlans_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CouponPlans_B_index" ON "_CouponPlans"("B");

-- AddForeignKey
ALTER TABLE "_CouponPlans" ADD CONSTRAINT "_CouponPlans_A_fkey" FOREIGN KEY ("A") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponPlans" ADD CONSTRAINT "_CouponPlans_B_fkey" FOREIGN KEY ("B") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
