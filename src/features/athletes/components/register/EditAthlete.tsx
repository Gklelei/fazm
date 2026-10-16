"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormAlert } from "@/components/form/FormAlert";
import { StickyActions } from "@/components/form/StickyActions";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { updateAthlete } from "../../actions/update-athlete";
import { athleteEditSchema, type RegistrationInput } from "../../schemas/registration";
import { StepAbout, StepAthlete, StepDocuments, StepGuardian, StepMedical, type StepProps } from "./steps";

const SECTIONS: { id: string; label: string; Body: React.ComponentType<StepProps>; medical: boolean }[] = [
  { id: "athlete", label: "Athlete", Body: StepAthlete, medical: false },
  { id: "guardian", label: "Parent or guardian", Body: StepGuardian, medical: false },
  { id: "medical", label: "Medical and emergency", Body: StepMedical, medical: true },
  { id: "about", label: "Address and football", Body: StepAbout, medical: false },
  { id: "documents", label: "Photo and documents", Body: StepDocuments, medical: false },
];

/**
 * The athlete's details on one page, built from the registration steps.
 * Sections the person may not change are shown read-only.
 */
export function EditAthlete({
  athleteId,
  guardianId,
  values,
  canEditMedical,
  canEditOther,
}: {
  athleteId: string;
  guardianId?: string;
  values: RegistrationInput;
  canEditMedical: boolean;
  canEditOther: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);
  // Same input type as registration (the steps are shared); consent and fee
  // plan aren't edited here, and the edit schema leaves them out
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(athleteEditSchema) as never,
    defaultValues: values,
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty && !saved);

  const submit = form.handleSubmit(
    () =>
      start(async () => {
        setError(null);
        const res = await updateAthlete(athleteId, form.getValues(), guardianId);
        if (!res.success) return setError(res.message);
        setSaved(true);
        toast.success(res.message);
        await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
        router.push(`/players/user-profile/${athleteId}`);
        router.refresh();
      }),
    () => setError("Some details need fixing. They're marked below."),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10" noValidate>
        <nav className="hidden lg:sticky lg:top-20 lg:block lg:self-start" aria-label="Sections">
          <ul className="space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <FormAlert message={error} />
          {SECTIONS.map(({ id, label, Body, medical }) => (
            <section key={id} id={id} className="scroll-mt-20 rounded-lg border bg-card p-4 sm:p-6" aria-label={label}>
              {medical ? (
                <Body goTo={() => {}} lockHealth={!canEditMedical} lockContact={!canEditOther} />
              ) : (
                <fieldset disabled={!canEditOther} className="disabled:opacity-70">
                  <Body goTo={() => {}} />
                </fieldset>
              )}
            </section>
          ))}

          <StickyActions>
            <Button variant="ghost" asChild>
              <Link href={`/players/user-profile/${athleteId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving || !form.formState.isDirty} className="min-w-32">
              {saving && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </StickyActions>
        </div>
      </form>
    </Form>
  );
}
