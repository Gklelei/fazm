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
import { cn } from "@/lib/utils";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
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
                        <button
                          type="button"
                          onClick={() => field.onChange(plan.id)}
                          className={cn(
                            "w-full text-left rounded-lg border p-4 transition-all",
                            "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-muted",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <p className="font-medium">{plan.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Monthly billing
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold">
                                {plan.amount}
                              </span>

                              {/* keep for accessibility/semantics; sr-only is fine */}
                              <RadioGroupItem
                                value={plan.id}
                                className="sr-only"
                                aria-label={plan.name}
                              />
                            </div>
                          </div>
                        </button>
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
