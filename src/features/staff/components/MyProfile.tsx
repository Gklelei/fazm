"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Activity, HandCoins, IdCard, Loader2, LogOut, Mail, Monitor, Siren, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem } from "@/components/ui/form";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { PhotoField } from "@/components/form/PhotoField";
import { TextField } from "@/components/form/TextField";
import { authClient } from "@/lib/auth-client";
import { formatAcademy } from "@/lib/academy-time";
import { ROLE_LABEL } from "@/lib/roles";
import type { ROLES } from "@/generated/prisma/enums";
import { updateMyProfile } from "../actions/edit-staff";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { PayPanel } from "@/features/payroll/components/PayPanel";
import { myProfileSchema, type MyProfileInput } from "../schemas/profile";

type Device = { id: string; device: string; ip: string | null; lastActive: string; current: boolean; count: number };
type LogEntry = { id: string; details: string | null; createdAt: string };

const when = (d: string) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Panel({ title, icon: Icon, aside, children }: { title: string; icon: React.ComponentType<{ className?: string }>; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
        {aside && <span className="ml-auto font-normal">{aside}</span>}
      </h2>
      {children}
    </section>
  );
}

/** The signed-in person's own page: their details, sign-in and devices, and what they've done. */
export function MyProfile({
  values,
  hasStaffRecord,
  email,
  role,
  work,
  devices,
  activity,
  pay,
}: {
  values: MyProfileInput;
  hasStaffRecord: boolean;
  email: string;
  role: ROLES;
  work: { staffId: string; jobTitle: string | null; batches: string } | null;
  devices: Device[];
  activity: LogEntry[];
  /** Their payslips and advances, when they're on the payroll */
  pay: Omit<React.ComponentProps<typeof PayPanel>, "staffId"> | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const form = useForm<MyProfileInput>({ resolver: zodResolver(myProfileSchema), defaultValues: values, mode: "onTouched" });

  const submit = form.handleSubmit((v) =>
    start(async () => {
      setError(null);
      const res = await updateMyProfile(v);
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      form.reset(v);
      router.refresh();
    }),
  );

  const signOutOthers = () =>
    startSignOut(async () => {
      const res = await authClient.revokeOtherSessions();
      if (res.error) return void toast.error("Couldn't sign out the other devices. Try again.");
      toast.success("Signed out on your other devices.");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 lg:order-1">
          <Form {...form}>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <FormAlert message={error} />
              <FormSection title="Your details" icon={UserRound}>
                <FormField
                  control={form.control}
                  name="photo"
                  render={({ field }) => (
                    <FormItem className="@md:col-span-2">
                      <PhotoField folder="PROFILE" value={field.value ?? ""} onChange={(v) => field.onChange(v)} />
                    </FormItem>
                  )}
                />
                <TextField<MyProfileInput> name="fullNames" label="Full name" autoComplete="name" />
                {hasStaffRecord && <TextField<MyProfileInput> name="phoneNumber" label="Phone" type="tel" inputMode="tel" />}
              </FormSection>
              {hasStaffRecord && (
                <FormSection title="Emergency contact" icon={Siren}>
                  <TextField<MyProfileInput> name="emergencyName" label="Name" optional />
                  <TextField<MyProfileInput> name="emergencyRelationship" label="Relationship" optional />
                  <TextField<MyProfileInput> name="emergencyPhone" label="Phone" optional type="tel" inputMode="tel" />
                </FormSection>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !form.formState.isDirty} className="min-w-32">
                  {saving && <Loader2 className="animate-spin" />} Save
                </Button>
              </div>
            </form>
          </Form>

          {pay && (
            <section className="mt-4 overflow-hidden rounded-xl border bg-card shadow-xs">
              <h2 className="flex items-center gap-3 border-b px-4 py-3 text-base font-semibold sm:px-5">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <HandCoins className="size-4" />
                </span>
                My pay
              </h2>
              <PayPanel {...pay} />
            </section>
          )}

          <section className="mt-4 overflow-hidden rounded-xl border bg-card shadow-xs">
            <h2 className="flex items-center gap-3 border-b px-4 py-3 text-base font-semibold sm:px-5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                <Activity className="size-4" />
              </span>
              Your activity
            </h2>
            {activity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">Nothing yet.</p>
            ) : (
              <ol className="divide-y">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm sm:px-5">
                    <span>{a.details}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{when(a.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2 max-lg:order-first">
          <section className="overflow-hidden rounded-xl bg-brand-navy text-white shadow-sm dark:ring-1 dark:ring-white/10">
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <ProfileAvatar name={values.fullNames} url={values.photo || undefined} size={64} className="ring-2 ring-brand-gold" />
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-white/60 uppercase">My profile</p>
                  <h1 className="font-display text-2xl leading-tight font-bold">{values.fullNames}</h1>
                  {work?.jobTitle && <p className="text-sm text-white/70">{work.jobTitle}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-brand-navy">{ROLE_LABEL[role]}</span>
                {work?.batches
                  .split(", ")
                  .filter(Boolean)
                  .map((b) => (
                    <span key={b} className="rounded-md bg-brand-gold px-2 py-0.5 text-xs font-bold text-brand-navy">
                      {b}
                    </span>
                  ))}
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-brand-gold" />
                  <dd className="truncate">{email}</dd>
                </div>
                {work && (
                  <div className="flex items-center gap-2">
                    <IdCard className="size-4 text-brand-gold" />
                    <dd className="font-mono text-xs">{work.staffId}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="border-t border-white/10 bg-white/5 p-4">
              <ChangePasswordDialog className="h-10 w-full bg-brand-gold text-brand-navy hover:bg-brand-gold/90" />
            </div>
          </section>

          <Panel
            title="Devices"
            icon={Monitor}
            aside={
              devices.reduce((n, d) => n + d.count, 0) > 1 && (
                <Button variant="ghost" size="sm" onClick={signOutOthers} disabled={signingOut}>
                  {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out others
                </Button>
              )
            }
          >
            <ul className="divide-y border-t">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Monitor className="size-4 shrink-0 text-muted-foreground" />
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="font-medium">
                      {d.device}
                      {d.current && <span className="ml-2 text-xs font-normal text-success">This device</span>}
                    </span>
                    <span className="truncate text-muted-foreground">
                      Active {when(d.lastActive)}
                      {d.ip && ` · ${d.ip}`}
                      {d.count > 1 && ` · ${d.count} sign-ins`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

        </aside>
      </div>
    </div>
  );
}
