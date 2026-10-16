"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, FileText, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormAlert } from "@/components/form/FormAlert";
import { academyToday, formatAcademy } from "@/lib/academy-time";
import { recordConsent, withdrawPhotoConsent } from "../../actions/consent";
import { CONSENT_TEXT, type ConsentLanguage } from "../../lib/consent-text";
import { consentSchema, type RegistrationInput } from "../../schemas/registration";
import { StepConsent } from "../register/steps";

export type ConsentRecord = {
  id: string;
  version: string;
  language: string;
  dataUse: boolean;
  emergencyTreatment: boolean;
  photos: boolean;
  givenByName: string;
  givenByRelationship: string;
  method: "IN_PERSON" | "SIGNED_FORM";
  formUrl: string | null;
  givenAt: string | Date;
  note: string | null;
  createdAt: string | Date;
  recordedBy: { name: string } | null;
};

type Athlete = {
  athleteId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  guardian?: { name: string; relationship: string };
};

const day = (d: string | Date) => formatAcademy(d, { day: "numeric", month: "long", year: "numeric" });

function Choice({ yes, label }: { yes: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {yes ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-destructive" aria-hidden />}
      <span>{label}</span>
      <span className="sr-only">{yes ? "yes" : "no"}</span>
    </li>
  );
}

/** Record or update consent, with the same consent step as registration. */
export function ConsentDialog({ athlete, current, trigger }: { athlete: Athlete; current?: ConsentRecord; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const defaults = (): RegistrationInput =>
    ({
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      dateOfBirth: athlete.dateOfBirth,
      guardianName: athlete.guardian?.name ?? "",
      guardianRelationship: athlete.guardian?.relationship ?? "",
      consentDataUse: current?.dataUse ?? false,
      consentEmergency: current?.emergencyTreatment ?? false,
      consentPhotos: current?.photos ?? false,
      consentGivenBy: current?.givenByName ?? "",
      consentRelationship: current?.givenByRelationship ?? "",
      consentMethod: current?.method ?? "IN_PERSON",
      consentFormUrl: current?.formUrl ?? "",
      consentDate: academyToday(),
      consentLanguage: (current?.language as ConsentLanguage) ?? "en",
    }) as RegistrationInput;
  const form = useForm<RegistrationInput>({ resolver: zodResolver(consentSchema) as never, defaultValues: defaults() });

  const save = form.handleSubmit(() =>
    start(async () => {
      setError(null);
      const res = await recordConsent(athlete.athleteId, form.getValues());
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    }),
  );

  return (
    <>
      <span onClick={() => (form.reset(defaults()), setError(null), setOpen(true))}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92svh] flex-col gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="border-b p-5">
            <DialogTitle>{current ? "Update consent" : "Record consent"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col" noValidate>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <FormAlert message={error} />
                <StepConsent />
              </div>
              <DialogFooter className="border-t p-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  Save consent
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsentPanel({ athlete, consents, canManage }: { athlete: Athlete; consents: ConsentRecord[]; canManage: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const current = consents[0];

  if (!current) {
    return (
      <div className="grid justify-items-center gap-3 py-8 text-center">
        <ShieldCheck className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">No consent recorded</p>
        {canManage && <ConsentDialog athlete={athlete} trigger={<Button>Record consent</Button>} />}
      </div>
    );
  }

  const text = CONSENT_TEXT[(current.language as ConsentLanguage) ?? "en"] ?? CONSENT_TEXT.en;
  const withdraw = () =>
    start(async () => {
      const res = await withdrawPhotoConsent(athlete.athleteId);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      setConfirm(false);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="space-y-2 text-sm">
          <Choice yes={current.dataUse} label={text.dataUse.title} />
          <Choice yes={current.emergencyTreatment} label={text.emergency.title} />
          <Choice yes={current.photos} label={text.photos.title} />
        </ul>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Given by</dt>
          <dd>
            {current.givenByName} ({current.givenByRelationship})
          </dd>
          <dt className="text-muted-foreground">How</dt>
          <dd>
            {current.method === "SIGNED_FORM" ? "Signed form" : "In person"}
            {current.formUrl && (
              <a href={current.formUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                <FileText className="size-3.5" /> Open form
              </a>
            )}
          </dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{day(current.givenAt)}</dd>
          <dt className="text-muted-foreground">Text</dt>
          <dd>
            Version {current.version}, {CONSENT_TEXT[(current.language as ConsentLanguage) ?? "en"]?.label ?? current.language}
          </dd>
        </dl>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <ConsentDialog
            athlete={athlete}
            current={current}
            trigger={<Button variant="outline">Update consent</Button>}
          />
          {current.photos && (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirm(true)}>
              Withdraw photo consent
            </Button>
          )}
        </div>
      )}

      {consents.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">History</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {consents.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2">
                <span>
                  {day(c.givenAt)} · {c.givenByName} ({c.givenByRelationship}) · photos {c.photos ? "yes" : "no"}
                  {c.note && <span className="text-muted-foreground"> · {c.note}</span>}
                </span>
                <span className="text-xs text-muted-foreground">Recorded by {c.recordedBy?.name ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw photo consent?</AlertDialogTitle>
            <AlertDialogDescription>
              {athlete.firstName}&apos;s photo will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                withdraw();
              }}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
