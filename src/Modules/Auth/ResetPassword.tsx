"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

function passwordStrength(pw: string) {
  // simple, practical checks
  const rules = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /[0-9]/.test(pw),
  ];
  const score = rules.filter(Boolean).length;
  return { score, rules };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = sp.get("token");
  const error = sp.get("error");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();

  const disabledBecauseNoToken = !token || error === "INVALID_TOKEN";

  const strength = useMemo(() => passwordStrength(pw), [pw]);
  const canSubmit =
    !disabledBecauseNoToken &&
    pw.length > 0 &&
    pw === pw2 &&
    strength.score >= 3 &&
    !isPending;

  const submit = () => {
    if (disabledBecauseNoToken) return;
    if (pw !== pw2) {
      toast.error("Passwords do not match");
      return;
    }
    if (strength.score < 3) {
      toast.error("Password is too weak");
      return;
    }

    startTransition(async () => {
      const { data, error } = await authClient.resetPassword({
        newPassword: pw,
        token: token!,
      });

      if (data?.status === true) {
        toast.success(data.status || "Password updated");
        router.push("/sign-in");
        return;
      }

      toast.error(error?.message || "Failed to reset password");
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Reset password
          </CardTitle>

          {error === "INVALID_TOKEN" ? (
            <p className="text-sm text-destructive">
              This reset link is invalid or expired. Request a new one.
            </p>
          ) : !token ? (
            <p className="text-sm text-destructive">
              Missing reset token. Open the link from your email again.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set a new password for your account.
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New password</label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter new password"
                disabled={disabledBecauseNoToken || isPending}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
                disabled={disabledBecauseNoToken}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Strength */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Password strength</span>
                <span className="font-mono">{strength.score}/4</span>
              </div>
              <ul className="list-disc ml-4 space-y-0.5">
                <li className={pw.length >= 8 ? "text-foreground" : ""}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(pw) ? "text-foreground" : ""}>
                  Contains uppercase letter
                </li>
                <li className={/[a-z]/.test(pw) ? "text-foreground" : ""}>
                  Contains lowercase letter
                </li>
                <li className={/[0-9]/.test(pw) ? "text-foreground" : ""}>
                  Contains a number
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm password</label>
            <Input
              type={show ? "text" : "password"}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Re-enter new password"
              disabled={disabledBecauseNoToken || isPending}
              autoComplete="new-password"
            />
            {pw2.length > 0 && pw !== pw2 ? (
              <p className="text-xs text-destructive">Passwords don’t match.</p>
            ) : null}
          </div>

          <Button className="w-full" onClick={submit} disabled={!canSubmit}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Reset password"
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            Remembered your password?{" "}
            <button
              className="underline underline-offset-4 hover:text-foreground"
              onClick={() => router.push("/sign-in")}
              type="button"
            >
              Go to sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
