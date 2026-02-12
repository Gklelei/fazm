"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type FormValues = { email: string };

type PasswordResetDialogProps = {
  /** What opens the dialog */
  trigger: React.ReactNode;

  /** Where Better Auth should send the user after they click email link (your reset page) */
  redirectTo: string;

  /** Pre-fill email (profile/admin). If provided and lockEmail=true, user can’t change it. */
  defaultEmail?: string;

  /** If true, email input is disabled (or hidden if hideEmailField=true). */
  lockEmail?: boolean;

  /** If true, hides the email field completely (use when you already have email). */
  hideEmailField?: boolean;

  title?: string;
  description?: string;
};

export function PasswordResetDialog({
  trigger,
  redirectTo,
  defaultEmail,
  lockEmail = false,
  hideEmailField = false,
  title = "Reset your password",
  description = "We’ll send a reset link to the provided email address.",
}: PasswordResetDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: { email: defaultEmail ?? "" },
  });

  // keep form email in sync if defaultEmail changes
  useMemo(() => {
    if (defaultEmail) setValue("email", defaultEmail);
  }, [defaultEmail, setValue]);

  const email = watch("email");

  const onSubmit = async (values: FormValues) => {
    const finalEmail =
      defaultEmail && (lockEmail || hideEmailField)
        ? defaultEmail
        : values.email;

    const cleaned = finalEmail.trim().toLowerCase();
    if (!cleaned) {
      toast.error("Email is required");
      return;
    }

    const { data, error } = await authClient.requestPasswordReset({
      email: cleaned,
      redirectTo,
      // fetchOptions:{}
    });

    if (data?.status === true) {
      toast.success(data.message || "Reset link sent");
      reset({ email: defaultEmail ?? "" });
      setOpen(false);
      return;
    }

    toast.error(error?.message || "Failed to send reset link");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {!hideEmailField && (
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter email"
                  className="pl-9"
                  disabled={isSubmitting || (lockEmail && !!defaultEmail)}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Enter a valid email address",
                    },
                  })}
                />
              </div>

              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}

              {defaultEmail && lockEmail ? (
                <p className="text-xs text-muted-foreground">
                  Sending to <span className="font-mono">{email}</span>
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
