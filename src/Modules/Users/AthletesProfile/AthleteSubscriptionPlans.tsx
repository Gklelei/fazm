"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Tag,
  Loader2Icon,
  Ticket,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import SubscriptionPlans from "./SubscriptionPlans";
import { GetAthleteByIdQueryType } from "../Types";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { ApplyCouponToAtheleteSubscriptionPlan } from "./EditUserProfile/Server/ApplyCoupon";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { formatDate } from "@/utils/TansformWords";
import { GetCouponsQueryType } from "@/app/(home)/users/players/user-profile/[id]/page";

const AthleteSubscriptionPlans = ({
  data,
  coupons,
}: {
  data: GetAthleteByIdQueryType;
  coupons: GetCouponsQueryType[];
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeSub = data.athleteSubscriptions?.find(
    (s) => s.status === "ACTIVE",
  );
  const activePlanId = activeSub?.subscriptionPlanId ?? null;

  const { data: utils } = UseUtilsContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plans = utils?.plans ?? [];

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId),
    [plans, activePlanId],
  );

  const canApply = Boolean(activeSub?.id) && couponCode.trim().length > 0;

  const normalizedInput = couponCode.trim().toUpperCase();
  const selectedCoupon = useMemo(
    () => coupons.find((c) => c.name === normalizedInput) ?? null,
    [coupons, normalizedInput],
  );

  const applyCoupon = (code?: string) => {
    const finalCode = (code ?? couponCode).trim().toUpperCase();

    if (!activeSub?.id) {
      setErrorText("No active subscription found for this athlete.");
      return;
    }
    if (!finalCode) {
      setErrorText("Enter a coupon code first.");
      return;
    }

    setErrorText(null);

    startTransition(async () => {
      const res = await ApplyCouponToAtheleteSubscriptionPlan({
        couponCode: finalCode,
        athleteId: data.athleteId,
        subId: activeSub.id,
      });

      if (res.success) {
        setCouponCode("");
        setErrorText(null);
        Sweetalert({ icon: "success", text: res.message, title: "Success!" });
      } else {
        setErrorText(res.message);
      }
    });
  };

  const formatCouponValue = (c: GetCouponsQueryType) =>
    c.discountType === "PERCENTAGE" ? `${c.value}%` : `KES ${c.value}`;

  const isCouponDisabled = (c: GetCouponsQueryType) =>
    c.status !== 1 || isPending;

  const isSelected = (c: GetCouponsQueryType) =>
    c.name === couponCode.trim().toUpperCase();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base sm:text-lg">
            Athlete subscription
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Manage plan and apply discount coupons.
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <SubscriptionPlans
            athleteId={data.athleteId}
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
                    <Badge className="bg-emerald-600 text-white gap-1">
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

                  {/* Coupon status */}
                  {activeSub.coupon ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="secondary" className="gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        {activeSub.coupon.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Coupon attached to subscription (usage increments on
                        invoice discount).
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground pt-1">
                      No coupon applied.
                    </div>
                  )}
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

            {/* Coupon section */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Available coupons */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Available coupons
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {coupons.length} total
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tap to select a coupon code.
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {coupons.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No coupons available.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {coupons.map((c) => {
                        const disabled = isCouponDisabled(c);
                        const picked = isSelected(c);

                        return (
                          <button
                            key={c.name}
                            type="button"
                            disabled={disabled}
                            onClick={() => setCouponCode(c.name)}
                            className={cn(
                              "group w-full rounded-xl border p-3 text-left transition",
                              "hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30",
                              picked && "border-primary bg-primary/5",
                              disabled &&
                                "opacity-60 cursor-not-allowed hover:bg-transparent",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="font-mono text-xs font-semibold tracking-wide">
                                  {c.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground line-clamp-1">
                                  {c.name.split("_").join(" ")}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {formatCouponValue(c)}
                                </Badge>
                                <span
                                  className={cn(
                                    "text-[10px] font-medium",
                                    c.status === 1
                                      ? "text-emerald-600"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {c.status === 1 ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </div>
                            </div>

                            {picked ? (
                              <div className="mt-2 text-[11px] text-primary font-medium">
                                Selected
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Apply coupon */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Apply coupon</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    This attaches the coupon to the active subscription.
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {errorText ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>{errorText}</div>
                    </div>
                  ) : null}

                  {/* Selected coupon preview */}
                  {selectedCoupon ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3">
                      <Badge variant="secondary" className="gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        {selectedCoupon.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatCouponValue(selectedCoupon)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedCoupon.status === 1
                          ? "Ready to apply"
                          : "Inactive"}
                      </span>
                    </div>
                  ) : normalizedInput ? (
                    <div className="text-xs text-muted-foreground">
                      Coupon code not found in the list (still can submit if you
                      want).
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Enter coupon code e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="h-11"
                      disabled={isPending}
                    />
                    <Button
                      className="h-11 sm:w-28"
                      onClick={() => applyCoupon()}
                      disabled={!canApply || isPending}
                    >
                      {isPending ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>

                  {/* Quick actions (only ACTIVE coupons) */}
                  <div className="flex flex-wrap gap-2">
                    {coupons
                      .filter((c) => c.status === 1)
                      .slice(0, 3)
                      .map((c) => (
                        <Button
                          key={c.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending || !activeSub?.id}
                          onClick={() => applyCoupon(c.name)}
                          className="rounded-xl"
                        >
                          Apply {c.name}
                        </Button>
                      ))}
                  </div>

                  {/* <div className="text-[11px] text-muted-foreground hidden">
                    Tip: Don’t increment{" "}
                    <span className="font-medium">timesUsed</span> here.
                    Increment only when an invoice is discounted to avoid cron
                    failures.
                  </div> */}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AthleteSubscriptionPlans;
