"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { AuthCard, FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";
import { PasswordRules } from "./PasswordRules";

export default function ChangePasswordForm({ name, required }: { name: string; required: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return setError("Enter your current password.");
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError("The two new passwords don't match.");
    if (next === current) return setError("Choose a password you haven't used here before.");

    start(async () => {
      setError(null);
      const { error: err } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (err) {
        if (err.code === "INVALID_PASSWORD") return setError("Your current password is wrong.");
        if (err.status === 429) return setError("Too many attempts. Wait a minute, then try again.");
        return setError(err.status === 400 && err.message ? err.message : "We couldn't change the password. Try again.");
      }
      // Re-read the session so the must-change lock lifts straight away
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <AuthCard
      title={required ? "Set a new password" : "Change password"}
      description={
        required
          ? `${name.split(" ")[0]}, the academy now requires stronger passwords. Set a new one to continue.`
          : "Choose a new password. You'll be signed out on your other devices."
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <div className="grid gap-2">
          <Label htmlFor="current">Current password</Label>
          <PasswordInput id="current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new">New password</Label>
          <PasswordInput id="new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          <PasswordRules value={next} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
          />
          {mismatch && <p className="text-sm text-destructive">Doesn&apos;t match the new password yet.</p>}
        </div>
        <Button type="submit" disabled={saving} className="h-12 w-full text-base">
          {saving && <Loader2 className="animate-spin" />}
          Save new password
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={async () => {
            await authClient.signOut();
            router.replace("/sign-in");
          }}
        >
          <LogOut /> {required ? "Sign out instead" : "Cancel and sign out"}
        </Button>
      </form>
    </AuthCard>
  );
}
