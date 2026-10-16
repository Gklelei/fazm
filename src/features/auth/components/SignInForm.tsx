"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";
import { signInSchema, type signInSchemaType } from "@/features/auth/schemas";
import { AuthCard, FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";

/** Plain words for what better-auth reports; never its raw message. */
function signInProblem(error: { code?: string; status?: number }) {
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password don't match. Check both and try again.";
  if (error.code === "FAILED_TO_CREATE_SESSION") return "This account has been deactivated. Ask an administrator to restore it.";
  return "We couldn't sign you in. Check your connection and try again.";
}

export default function SignInForm({ next, passwordReset }: { next: string; passwordReset: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<signInSchemaType>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = (data: signInSchemaType) =>
    start(async () => {
      setError(null);
      const { error: err } = await authClient.signIn.email(data);
      if (err) {
        setError(signInProblem(err));
        form.setValue("password", "");
        form.setFocus("password");
        return;
      }
      router.replace(next);
      router.refresh();
    });

  const email = (useWatch({ control: form.control, name: "email" }) ?? "").trim();

  return (
    <AuthCard title="Staff sign in" description="For Fazam coaches, finance and administrators.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
          {passwordReset && !error && (
            <Alert className="border-success/40 bg-success/5 text-success">
              <CheckCircle2 />
              <AlertDescription className="text-foreground">Your password was changed. Sign in with the new one.</AlertDescription>
            </Alert>
          )}
          <FormError message={error} />

          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="username" inputMode="email" autoFocus className="h-12 text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                    className="text-sm font-medium text-primary underline-offset-4 dark:text-[#9DB1EE] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput {...field} autoComplete="current-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={pending} className="h-12 w-full text-base">
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
