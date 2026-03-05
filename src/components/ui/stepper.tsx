import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  title: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  getStepStatus?: (
    stepId: number,
  ) => "completed" | "error" | "valid" | "pending";
}

export function Stepper({ steps, currentStep, getStepStatus }: StepperProps) {
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="w-full space-y-4 mb-8">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between mt-2">
        {steps.map((step) => {
          const status = getStepStatus
            ? getStepStatus(step.id)
            : currentStep > step.id
              ? "completed"
              : currentStep === step.id
                ? "pending"
                : "pending";

          return (
            <div
              key={step.id}
              className="flex flex-col items-center max-w-[80px] text-center"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  status === "completed"
                    ? "bg-primary text-primary-foreground"
                    : "",
                  status === "error"
                    ? "bg-destructive text-destructive-foreground"
                    : "",
                  status === "valid" ? "bg-blue-500 text-white" : "",
                  status === "pending" && currentStep !== step.id
                    ? "bg-muted text-muted-foreground"
                    : "",
                  currentStep === step.id
                    ? "ring-2 ring-primary ring-offset-2 bg-primary/20 text-primary"
                    : "",
                )}
              >
                {status === "completed" ? "✓" : step.id}
              </div>
              <span
                className={cn(
                  "mt-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold",
                  currentStep >= step.id
                    ? "text-primary"
                    : "text-muted-foreground",
                  status === "error" ? "text-destructive" : "",
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
