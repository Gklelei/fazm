"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { cn } from "@/lib/utils";
import { Loader2, Mail } from "lucide-react";

interface Props extends React.ComponentProps<typeof Button> {
  email?: string;
  buttonText?: string;
  redirectTo?: string;
  showEmailPopUp?: boolean;
}

const SendPasswordResetLinkButton = ({
  email = "",
  buttonText = "Send Reset Link",
  className,
  variant = "outline",
  redirectTo = "/res-password",
  showEmailPopUp = false,
  ...props
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputEmail, setInputEmail] = useState(email);

  const executeReset = async (targetEmail: string) => {
    if (!targetEmail.trim()) {
      Sweetalert({
        icon: "error",
        title: "Missing Email",
        text: "Please provide a valid email address.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: targetEmail,
        redirectTo,
      });

      if (error) {
        Sweetalert({
          icon: "error",
          title: "Error",
          text: error.message || "Failed to send reset email.",
        });
      } else {
        Sweetalert({
          icon: "success",
          title: "Email Sent",
          text: `A reset link has been sent to ${targetEmail}.`,
        });
        setIsDialogOpen(false);
        setInputEmail("");
      }
    } catch {
      Sweetalert({
        icon: "error",
        title: "Unexpected Error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = async () => {
    if (showEmailPopUp) {
      setInputEmail(email);
      setIsDialogOpen(true);
    } else {
      await executeReset(email);
    }
  };

  return (
    <>
      <Button
        onClick={handleButtonClick}
        className={cn("gap-2", className)}
        variant={variant}
        type="button"
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && !showEmailPopUp && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {buttonText}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold">
              Reset your password
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter your account email and we’ll send you a secure reset link.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="w-full"
                disabled={isLoading}
                onClick={(e) => {
                  e.preventDefault();
                  executeReset(inputEmail);
                }}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SendPasswordResetLinkButton;
