"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/TansformWords";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { AddAthleteToSubscriptionPlan } from "./EditUserProfile/Server/AddAthletePlan";

type Props = {
  athleteId: string;
  activePlanId?: string | null;
};

const SubscriptionPlans = ({ athleteId, activePlanId }: Props) => {
  const router = useRouter();
  const { data } = UseUtilsContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plans = data?.plans ?? [];

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId),
    [plans, activePlanId],
  );

  const isEditing = Boolean(activePlanId);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    activePlanId ?? "",
  );

  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSubmit = selectedPlanId && selectedPlanId !== activePlanId;

  async function onSave() {
    if (!selectedPlanId) {
      Sweetalert({
        icon: "error",
        title: "Missing plan",
        text: "Select a plan first.",
      });
      return;
    }

    startTransition(async () => {
      const result = await AddAthleteToSubscriptionPlan({
        id: selectedPlanId,
        mode: isEditing ? "edit" : "create",
        athleteId,
      });

      if (result.success) {
        Sweetalert({
          icon: "success",
          title: "Success!",
          text: result.message,
        });
        setOpen(false);
        router.refresh(); // client refresh (server revalidatePath already runs too)
      } else {
        Sweetalert({
          icon: "error",
          title: "An error has occurred",
          text: result.message,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEditing ? "outline" : "default"} size="sm">
          {isEditing ? "Change plan" : "Assign plan"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0">
        <div className="border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? "Change subscription plan"
                : "Assign a subscription plan"}
            </DialogTitle>
            <DialogDescription>
              Select one plan to apply to this athlete. The current active plan
              (if any) is highlighted.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-4">
          {activePlan ? (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current plan</CardTitle>
                <CardDescription>
                  Active subscription plan for this athlete.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{activePlan.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(parseInt(activePlan.amount))}
                    {" • "}
                    {/* {activePlan.interval} */}
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </Badge>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Available plans</CardTitle>
              <CardDescription>Choose a plan and save.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => {
                const isActive = plan.id === activePlanId;
                const isSelected = plan.id === selectedPlanId;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "w-full text-left rounded-lg border p-4 transition",
                      "hover:bg-muted/50",
                      isSelected && "border-primary ring-2 ring-primary/20",
                      isActive && "border-emerald-500",
                      isPending && "opacity-70 cursor-not-allowed",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium leading-none">
                          {plan.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(parseInt(plan.amount))}
                          {" • "}
                          {/* {plan.interval} */}
                        </div>
                      </div>

                      {isActive ? (
                        <Badge className="bg-emerald-600 text-white">
                          Active
                        </Badge>
                      ) : isSelected ? (
                        <Badge variant="default">Selected</Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              type="button"
              onClick={() => {
                setSelectedPlanId(activePlanId ?? "");
                setOpen(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>

            <Button
              className="flex-1"
              type="button"
              onClick={onSave}
              disabled={!canSubmit || isPending}
            >
              {isPending ? (
                <Loader2Spinner />
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Assign plan"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlans;
