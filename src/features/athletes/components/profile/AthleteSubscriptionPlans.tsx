"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import SubscriptionPlans from "@/features/athletes/components/profile/SubscriptionPlans";
import { GetAthleteByIdQueryType } from "@/features/athletes/queries";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { AthleteCoupons, type GivenCoupon } from "@/features/coupons/components/AthleteCoupons";
import { formatDate } from "@/lib/format";
import type { AthleteCouponOption } from "@/features/coupons/queries";

const AthleteSubscriptionPlans = ({
  data,
  coupons,
}: {
  data: GetAthleteByIdQueryType;
  coupons: AthleteCouponOption[];
}) => {
  const activeSub = data.athleteSubscriptions?.find(
    (s) => s.status === "ACTIVE",
  );
  const activePlanId = activeSub?.subscriptionPlanId ?? null;

  const { data: utils } = UseUtilsContext();
  const plans = utils?.plans ?? [];
  const activePlan = plans.find((p) => p.id === activePlanId);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base sm:text-lg">
            Athlete subscription
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Their fee plan, and the coupons on their fees invoices.
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <SubscriptionPlans
            athleteId={data.athleteId}
            batchId={data.batches?.id ?? null}
            activePlanId={activePlanId}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!activeSub ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No active subscription.
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold sm:text-base">
                      {activePlan?.name ?? "Active plan"}
                    </div>
                    <Badge className="bg-success text-white gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      ACTIVE
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Interval:{" "}
                      <span className="font-medium">
                        {activeSub.subscriptionPlan.interval}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                      Plan ID:{" "}
                      <span className="font-mono">
                        {activeSub.subscriptionPlanId}
                      </span>
                    </span>
                  </div>

                </div>

                <div className="text-xs text-muted-foreground sm:text-right">
                  <div className="font-medium text-foreground">Billing</div>
                  <div>
                    Period end:{" "}
                    <span className="font-medium text-foreground">
                      {activeSub.currentPeriodEnd
                        ? formatDate(new Date(activeSub.currentPeriodEnd))
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Coupons given to the athlete, and giving one */}
            <AthleteCoupons athleteId={data.athleteId} given={data.couponRedemptions as unknown as GivenCoupon[]} options={coupons} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AthleteSubscriptionPlans;
