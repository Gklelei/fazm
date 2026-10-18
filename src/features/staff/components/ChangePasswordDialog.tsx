"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/form/FormAlert";
import { authClient } from "@/lib/auth-client";
import { passwordProblem } from "@/lib/password-policy";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { PasswordRules } from "@/features/auth/components/PasswordRules";

/** Change your password without leaving the profile. Other devices are signed out. */
export function ChangePasswordDialog({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return setError("Enter your current password.");
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError("The two new passwords don't match.");
    if (next === current) return setError("Choose a password you haven't used here before.");
    start(async () => {
      setError(null);
      const { error: err } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
      if (err) {
        if (err.code === "INVALID_PASSWORD") return setError("Your current password is wrong.");
        if (err.status === 429) return setError("Too many attempts. Wait a minute, then try again.");
        return setError(err.status === 400 && err.message ? err.message : "We couldn't change the password. Try again.");
      }
      toast.success("Password changed. Your other devices were signed out.");
      setOpen(false);
      reset();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className={className}>
          <KeyRound /> Change password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>You&apos;ll stay signed in here and be signed out on your other devices.</DialogDescription>
          </DialogHeader>
          <FormAlert message={error} />
          <div className="grid gap-1.5">
            <Label htmlFor="pw-current">Current password</Label>
            <PasswordInput id="pw-current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pw-new">New password</Label>
            <PasswordInput id="pw-new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <PasswordRules value={next} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <PasswordInput id="pw-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={confirm.length > 0 && confirm !== next} />
            {confirm.length > 0 && confirm !== next && <p className="text-sm text-destructive">The two new passwords don&apos;t match.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-36">
              {saving && <Loader2 className="animate-spin" />} Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
