"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { AuthCard, FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";
import { PasswordRules } from "./PasswordRules";

export function ExpiredLink() {
  return (
    <AuthCard title="Link expired" description="Reset links work once, for one hour. This one has expired or was already used.">
      <div className="space-y-3">
        <Button asChild className="h-12 w-full text-base">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
        <Button asChild variant="ghost" className="h-12 w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    </AuthCard>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, start] = useTransition();
  const mismatch = confirm.length > 0 && pass !== confirm;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(pass);
    if (problem) return setError(problem);
    if (pass !== confirm) return setError("The two passwords don't match.");
    start(async () => {
      setError(null);
      const { error: err } = await authClient.resetPassword({ newPassword: pass, token });
      if (err) {
        if (err.code === "INVALID_TOKEN") return setExpired(true);
        // The server applies the same password rule; its reason is safe to show
        return setError(err.status === 400 && err.message ? err.message : "We couldn't save the password. Try again.");
      }
      router.replace("/sign-in?reset=done");
    });
  };

  if (expired) return <ExpiredLink />;

  return (
    <AuthCard title="New password" description="Choose a new password. You'll be signed out on every device and can sign in with it straight away.">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error} />
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput id="new-password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" autoFocus />
          <PasswordRules value={pass} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? "confirm-hint" : undefined}
          />
          {mismatch && <p id="confirm-hint" className="text-sm text-destructive">Doesn&apos;t match the new password yet.</p>}
        </div>
        <Button type="submit" disabled={pending} className="h-12 w-full text-base">
          {pending && <Loader2 className="animate-spin" />}
          Save new password
        </Button>
      </form>
    </AuthCard>
  );
}
