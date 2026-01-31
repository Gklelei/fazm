"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeftCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PersonalInformation from "./PersonalInformation";
import AthletesGuardian from "./AthletesGuardian";
import AthleteAddress from "./AthleteAddress";
import AthletesMedical from "./AthletesMedical";
import AthleteDoccumnets from "./AthleteDoccumnets";
import AthletePhysicals from "./AthletePhysicals";
import AthleteOnboardingAction from "../../Server/OnBoarding";
import {
  AthleteOnBoardingSchema,
  AthleteOnBoardingType,
} from "../../validation";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useQueryClient } from "@tanstack/react-query";
import PaymentPlan from "./SubscriptionPlan";

const STEPS = [
  {
    id: 1,
    title: "Personal Info",
    fields: [
      "firstName",
      "lastName",
      "middleName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "batch",
      "profilePIcture",
    ],
  },
  {
    id: 2,
    title: "Guardians",
    fields: [
      "guardianFullNames",
      "guardianRelationShip",
      "guardianEmail",
      "guardianPhoneNumber",
    ],
  },
  {
    id: 3,
    title: "Address",
    fields: ["country", "county", "subCounty", "addressLine1", "addressLine2"],
  },
  {
    id: 4,
    title: "Documents",
    fields: [
      "birthCertificate",
      "idFront",
      "idBack",
      "passportCover",
      "passportPage",
    ],
  },
  {
    id: 5,
    title: "Physicals",
    fields: [
      "height",
      "weight",
      "dominantFoot",
      "dominantHand",
      "playingPositions",
    ],
  },
  {
    id: 6,
    title: "Medical",
    fields: [
      "bloodGroup",
      "allergies",
      "medicalConditions",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelationship",
    ],
  },
  {
    id: 7,
    title: "Subscription plan",
    fields: ["subscriptionPlanId"],
  },
];

const AthletesOnboardingForm = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const queryClient = useQueryClient();
  const [isPending, startTransistion] = useTransition();

  const form = useForm<AthleteOnBoardingType>({
    resolver: zodResolver(AthleteOnBoardingSchema),
    mode: "onChange",
    defaultValues: {
      guardianEmail: "",
      guardianFullNames: "",
      guardianPhoneNumber: "",
      guardianRelationShip: "",
      addressLine1: "",
      addressLine2: "",
      allergies: "",
      bloodGroup: "",
      country: "",
      county: "",
      dateOfBirth: "",
      email: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      firstName: "",
      lastName: "",
      medicalConditions: "",
      phoneNumber: "",
      profilePIcture: "",
      subCounty: "",
      batch: "",
      middleName: "",
      birthCertificate: "",
      dominantFoot: "",
      dominantHand: "",
      height: "",
      idBack: "",
      idFront: "",
      passportCover: "",
      passportPage: "",
      playingPositions: "",
      weight: "",
      subscriptionPlanId: "",
    },
  });

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = async () => {
    const currentStepFields = STEPS[currentStep - 1].fields;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isValid = await form.trigger(currentStepFields as any);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    } else {
      // Scroll to first error
      const firstError = Object.keys(form.formState.errors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add error highlight
        element.classList.add("border-red-500");
        setTimeout(() => {
          element.classList.remove("border-red-500");
        }, 2000);
      }

      // Sweetalert({
      //   icon: "error",
      //   title: "Validation Error",
      //   text: "Please fix all errors before proceeding to the next step.",
      // });
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (data: AthleteOnBoardingType) => {
    startTransistion(async () => {
      const isValid = await form.trigger();

      if (!isValid) {
        Sweetalert({
          icon: "error",
          title: "Validation Error",
          text: "Please fix all errors before submitting the form.",
        });
        return;
      }
      const result = await AthleteOnboardingAction(data);

      if (result.status === "SUCCESS") {
        await queryClient.invalidateQueries({
          queryKey: ["all-athletes"],
        });
        Sweetalert({
          icon: "success",
          text: result.successMessage,
          title: "Success!",
        });
        router.push("/users/players");
      } else {
        Sweetalert({
          icon: "error",
          text: result.errorMessage,
          title: "Error",
        });
      }
    });
  };

  const getStepStatus = (stepId: number) => {
    const stepFields = STEPS.find((step) => step.id === stepId)?.fields || [];
    const hasErrors = stepFields.some(
      (field) => form.formState.errors[field as keyof AthleteOnBoardingType],
    );
    const isTouched = stepFields.some(
      (field) =>
        form.formState.touchedFields[field as keyof AthleteOnBoardingType],
    );

    if (stepId < currentStep) return "completed";
    if (hasErrors) return "error";
    if (isTouched && !hasErrors) return "valid";
    return "pending";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Visual Progress Stepper with Status */}
      <div className="px-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${status === "completed" ? "bg-green-500 text-white" : ""}
                  ${status === "error" ? "bg-red-500 text-white" : ""}
                  ${status === "valid" ? "bg-blue-500 text-white" : ""}
                  ${status === "pending" ? "bg-gray-200 text-gray-500" : ""}
                  ${currentStep === step.id ? "ring-2 ring-primary ring-offset-2" : ""}
                `}
                >
                  {status === "completed" ? "✓" : step.id}
                </div>
                <span
                  className={`
                  mt-1 text-[10px] uppercase tracking-wider font-semibold
                  ${currentStep >= step.id ? "text-primary" : "text-muted-foreground"}
                  ${status === "error" ? "text-red-500" : ""}
                `}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  size="icon"
                  type="button"
                >
                  <ArrowLeftCircle className="h-8 w-8 text-muted-foreground" />
                </Button>
                <div>
                  <CardTitle className="text-xl">
                    Step {currentStep}: {STEPS[currentStep - 1].title}
                  </CardTitle>
                  <CardDescription>
                    Complete the details for the athlete registration
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {Object.keys(form.formState.errors).length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h4 className="font-semibold text-red-700 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-sm text-red-600 list-disc pl-5">
                  {Object.entries(form.formState.errors).map(
                    ([field, error]) => (
                      <li key={field}>
                        <strong>{field}:</strong> {error.message}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <CardContent className="min-h-100">
              <div className={currentStep === 1 ? "block" : "hidden"}>
                <PersonalInformation />
              </div>
              <div className={currentStep === 2 ? "block" : "hidden"}>
                <AthletesGuardian />
              </div>
              <div className={currentStep === 3 ? "block" : "hidden"}>
                <AthleteAddress />
              </div>
              <div className={currentStep === 4 ? "block" : "hidden"}>
                <AthleteDoccumnets />
              </div>
              <div className={currentStep === 5 ? "block" : "hidden"}>
                <AthletePhysicals />
              </div>
              <div className={currentStep === 6 ? "block" : "hidden"}>
                <AthletesMedical />
              </div>
              <div className={currentStep === 7 ? "block" : "hidden"}>
                <PaymentPlan />
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-10 mt-8 border-t border-dashed">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="gap-2 px-8"
                  >
                    Next Step <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="gap-2 px-8 bg-green-600 hover:bg-green-700"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <>
                        Complete Registration <Check className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Step Completion Status */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Current Step: {currentStep} of {STEPS.length}
                  </span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {getStepStatus(currentStep) === "error" && (
                    <span className="text-red-500">
                      ⚠️ Please fix errors in this step
                    </span>
                  )}
                  {getStepStatus(currentStep) === "valid" && (
                    <span className="text-green-500">
                      ✓ This step is complete
                    </span>
                  )}
                  {getStepStatus(currentStep) === "pending" && (
                    <span>Fill in all required fields</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default AthletesOnboardingForm;
