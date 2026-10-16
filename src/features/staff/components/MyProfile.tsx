"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2, LogOut, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { PhotoField } from "@/components/form/PhotoField";
import { TextField } from "@/components/form/TextField";
import { authClient } from "@/lib/auth-client";
import { formatAcademy } from "@/lib/academy-time";
import { ROLE_LABEL } from "@/lib/roles";
import type { ROLES } from "@/generated/prisma/enums";
import { updateMyProfile } from "../actions/edit-staff";
import { myProfileSchema, type MyProfileInput } from "../schemas/profile";

type Device = { id: string; device: string; ip: string | null; lastActive: string; current: boolean };
type LogEntry = { id: string; details: string | null; createdAt: string };

const when = (d: string) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
        {aside}
      </header>
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
}: {
  values: MyProfileInput;
  hasStaffRecord: boolean;
  email: string;
  role: ROLES;
  work: { staffId: string; jobTitle: string | null; batches: string } | null;
  devices: Device[];
  activity: LogEntry[];
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
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary">{ROLE_LABEL[role]}</span>
            {work?.jobTitle && <span className="font-medium text-foreground">{work.jobTitle}</span>}
            {work && <span className="font-mono text-xs">{work.staffId}</span>}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Form {...form}>
            <form onSubmit={submit} className="space-y-6 rounded-lg border bg-card p-4 sm:p-6" noValidate>
              <FormAlert message={error} />
              <FormSection title="Your details">
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
                <FormSection title="Emergency contact">
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
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Panel
            title="Sign-in"
            aside={
              <Button variant="outline" size="sm" asChild>
                <Link href="/change-password">
                  <KeyRound /> Change password
                </Link>
              </Button>
            }
          >
            <dl className="divide-y text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate font-medium">{email}</dd>
              </div>
              {work && (
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted-foreground">Batches</dt>
                  <dd className="font-medium">{work.batches || "—"}</dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel
            title="Devices"
            aside={
              devices.length > 1 && (
                <Button variant="ghost" size="sm" onClick={signOutOthers} disabled={signingOut}>
                  {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out others
                </Button>
              )
            }
          >
            <ul className="divide-y">
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
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Your activity">
            {activity.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ol className="divide-y">
                {activity.map((a) => (
                  <li key={a.id} className="px-4 py-2.5 text-sm">
                    <p>{a.details}</p>
                    <p className="text-muted-foreground">{when(a.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
