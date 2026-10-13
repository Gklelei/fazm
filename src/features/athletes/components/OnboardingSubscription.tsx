"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/format";

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: "Billed monthly",
  WEEKLY: "Billed weekly",
  YEARLY: "Billed yearly",
  DAILY: "Billed daily",
  ONCE: "One-off payment",
};
import { cn } from "@/lib/utils";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { useFormContext } from "react-hook-form";

const PaymentPlan = () => {
  const { data } = UseUtilsContext();
  const { control } = useFormContext();

  const plans = data?.plans ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription plan</CardTitle>
        <CardDescription>
          Add athlete to a monthly subscription plan
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FormField
          name="subscriptionPlanId"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="mb-3 block">Available plans</FormLabel>

              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subscription plans available
                </p>
              ) : (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {plans.map((plan) => {
                    const selected = field.value === plan.id;

                    return (
                      <FormItem key={plan.id}>
                        <label
                          htmlFor={`plan-${plan.id}`}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 transition-colors",
                            "hover:border-primary/50 has-focus-visible:ring-2 has-focus-visible:ring-ring",
                            selected ? "border-primary bg-primary/5" : "border-border",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <RadioGroupItem id={`plan-${plan.id}`} value={plan.id} />
                            <span className="grid gap-0.5">
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {INTERVAL_LABEL[plan.interval] ?? plan.interval}
                              </span>
                            </span>
                          </span>
                          <span className="tabular font-mono text-sm font-semibold">
                            {formatCurrency(Number(plan.amount))}
                          </span>
                        </label>
                      </FormItem>
                    );
                  })}
                </RadioGroup>
              )}

              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default PaymentPlan;
