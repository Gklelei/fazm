"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, type forgotPasswordSchemaType } from "@/features/auth/schemas";
import { AuthCard, FormError } from "./AuthCard";

const BackToSignIn = () => (
  <Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 dark:text-[#9DB1EE] hover:underline">
    <ArrowLeft className="size-4" /> Back to sign in
  </Link>
);

export default function ForgotPasswordForm({ email }: { email: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<forgotPasswordSchemaType>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email },
  });

  const submit = (data: forgotPasswordSchemaType) =>
    start(async () => {
      setError(null);
      const { error: err } = await authClient.requestPasswordReset({ email: data.email, redirectTo: "/res-password" });
      if (err) {
        setError(err.status === 429 ? "Too many requests. Wait a minute, then try again." : "We couldn't send the link. Check your connection and try again.");
        return;
      }
      setSentTo(data.email);
    });

  // The server answers the same whether or not the account exists, so the
  // page can't be used to find out who has an account.
  if (sentTo) {
    return (
      <AuthCard title="Check your email">
        <div className="space-y-5">
          <div className="flex gap-3 rounded-lg bg-muted p-4 text-sm">
            <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <p>
              If <strong className="break-all">{sentTo}</strong> has an account, a reset link is on its way. It works once,
              for one hour. Check your spam folder if it doesn&apos;t arrive in a few minutes.
            </p>
          </div>
          <Button variant="outline" className="h-12 w-full" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
          <BackToSignIn />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password" description="Enter your email and we'll send you a link to choose a new password.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
          <FormError message={error} />
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" inputMode="email" autoFocus className="h-12 text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={pending} className="h-12 w-full text-base">
            {pending && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
          <BackToSignIn />
        </form>
      </Form>
    </AuthCard>
  );
}
