"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormAlert } from "@/components/form/FormAlert";
import { StepRail } from "@/components/form/StepRail";
import { StickyActions } from "@/components/form/StickyActions";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { academyToday } from "@/lib/academy-time";
import { registerAthlete } from "../../actions/register-athlete";
import {
  REGISTRATION_STEPS,
  missingDocuments,
  registrationRules,
  registrationSchema,
  type Registration,
  type RegistrationInput,
} from "../../schemas/registration";
import { StepAbout, StepAthlete, StepConsent, StepDocuments, StepGuardian, StepMedical, StepPlan, StepReview, type StepProps } from "./steps";

const EMPTY: RegistrationInput = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  phoneNumber: "",
  email: "",
  batch: "",
  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  guardianEmail: "",
  bloodGroup: undefined as unknown as RegistrationInput["bloodGroup"],
  allergies: [],
  medicalConditions: [],
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  town: "",
  estate: "",
  addressLine1: "",
  height: "",
  weight: "",
  foot: "right",
  hand: "right",
  positions: [],
  consentDataUse: false,
  consentEmergency: false,
  consentPhotos: false,
  consentGivenBy: "",
  consentRelationship: "",
  consentMethod: "IN_PERSON",
  consentFormUrl: "",
  consentDate: academyToday(),
  consentLanguage: "en",
  profilePhoto: "",
  birthCertificate: "",
  idFront: "",
  idBack: "",
  passportCover: "",
  passportPage: "",
  subscriptionPlanId: "",
};

const STEP_BODY: React.ComponentType<StepProps>[] = [StepAthlete, StepGuardian, StepMedical, StepAbout, StepConsent, StepDocuments, StepPlan, StepReview];

/** Registration as one guided flow: each step is checked before the next, then reviewed and saved in one go. */
export function RegisterAthlete() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const academy = UseUtilsContext().data?.academy;
  const requiredDocuments = academy?.requiredDocuments ?? [];
  const form = useForm<RegistrationInput, unknown, Registration>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { ...EMPTY, subscriptionPlanId: academy?.defaultPlanId ?? "" },
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty && !saved);

  const current = REGISTRATION_STEPS[step];
  const Body = STEP_BODY[step];
  const last = step === REGISTRATION_STEPS.length - 1;

  /** Checks this step's fields, including rules across fields (guardian under 18...). */
  const checkStep = async () => {
    const fields = current.fields as readonly FieldPath<RegistrationInput>[];
    const fieldsOk = await form.trigger([...fields]);
    const crossIssues = [...registrationRules(form.getValues()), ...missingDocuments(form.getValues(), requiredDocuments)].filter((r) =>
      (fields as readonly string[]).includes(r.path),
    );
    for (const r of crossIssues) form.setError(r.path, { type: "custom", message: r.message });
    return fieldsOk && crossIssues.length === 0;
  };

  const go = (to: number) => {
    setStep(to);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = async () => {
    if (!(await checkStep())) {
      const first = document.querySelector<HTMLElement>("[aria-invalid=true]");
      first?.focus();
      return;
    }
    setDone((d) => new Set(d).add(current.key));
    go(step + 1);
  };

  const submit = form.handleSubmit(
    // The action checks and converts the raw form values itself
    () =>
      start(async () => {
        setError(null);
        const res = await registerAthlete(form.getValues());
        if (!res.success) {
          setError(res.message);
          return;
        }
        setSaved(true);
        toast.success(res.message);
        await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
        router.push("athleteId" in res ? `/players/user-profile/${res.athleteId}` : "/players");
      }),
    // Something on an earlier step is wrong: go back to the first such step
    (errors) => {
      const bad = REGISTRATION_STEPS.findIndex((s) => s.fields.some((f) => f in errors));
      if (bad >= 0 && bad !== step) go(bad);
      setError("Some details need fixing before the athlete can be registered.");
    },
  );

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (last) submit(e);
          else next();
        }}
        className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10"
        noValidate
      >
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <StepRail steps={[...REGISTRATION_STEPS]} current={step} done={done} onSelect={go} />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="space-y-4">
            <FormAlert message={error} />
            <Body goTo={go} />
          </div>

          <StickyActions>
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => go(step - 1)} disabled={saving}>
                <ArrowLeft /> Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!form.formState.isDirty || window.confirm("Leave without registering? What you've entered will be lost.")) router.push("/players");
                }}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={saving} className="min-w-36">
              {saving ? <Loader2 className="animate-spin" /> : last ? <Check /> : null}
              {last ? "Register athlete" : "Continue"}
              {!last && <ArrowRight />}
            </Button>
          </StickyActions>
        </div>
      </form>
    </Form>
  );
}
