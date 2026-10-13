"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { PasswordRules } from "./PasswordRules";

const field =
  "h-11 border-white/10 bg-white/10 pr-10 text-white placeholder:text-white/30 focus-visible:border-brand-gold/60 focus-visible:ring-brand-gold/10";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/80"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default function ChangePasswordForm({ name, required }: { name: string; required: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(next);
    if (!current) return setError("Enter your current password.");
    if (problem) return setError(problem);
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError("Choose a password you haven't used here before.");
    setError(null);

    start(async () => {
      const { error: err } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (err) {
        setError(
          err.code === "INVALID_PASSWORD" ? "Your current password is wrong." : err.message ?? "Couldn't change the password.",
        );
        return;
      }
      // Re-read the session so the lock lifts immediately
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <div className="relative z-10 w-full max-w-md space-y-7 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/Fazam Logo-BG.png" alt="" width={64} height={64} className="drop-shadow-2xl" />
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold tracking-wide text-white uppercase">
            {required ? "Set a new password" : "Change password"}
          </h1>
          <p className="text-sm text-white/60">
            {required
              ? `${name.split(" ")[0]}, the academy now requires stronger passwords. Set a new one to continue.`
              : "Choose a new password for your account."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="current" className="text-white/80">Current password</Label>
          <PasswordInput id="current" value={current} onChange={setCurrent} autoComplete="current-password" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new" className="text-white/80">New password</Label>
          <PasswordInput id="new" value={next} onChange={setNext} autoComplete="new-password" />
          <PasswordRules value={next} tone="onDark" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm" className="text-white/80">Confirm new password</Label>
          <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-white">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="h-11 w-full bg-brand-gold font-semibold text-brand-navy hover:bg-brand-gold/90"
        >
          {saving && <Loader2 className="animate-spin" />}
          Save new password
        </Button>
        <p className="text-center text-xs text-white/40">You&apos;ll be signed out on your other devices.</p>
      </form>

      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          router.replace("/sign-in");
        }}
        className="mx-auto flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70"
      >
        <LogOut className="size-3" /> Sign out instead
      </button>
    </div>
  );
}
