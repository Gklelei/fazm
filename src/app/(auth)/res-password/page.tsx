"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { redirect } from "next/navigation";
import React from "react";

const ResetPassword = () => {
  redirect("/");
  const [pass, setPass] = React.useState("");
  const [email, setEmail] = React.useState("");

  const getPasswordResetLink = async () => {
    // Basic validation
    if (!email) {
      Sweetalert({
        title: "Warning",
        text: "Please enter an email",
        icon: "warning",
      });
      return;
    }

    const { data: res, error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/res-password",
    });

    if (res?.status === true) {
      Sweetalert({
        title: "Success",
        text: res?.message || "Reset link sent to your email.",
        icon: "success",
      });
    } else {
      Sweetalert({
        title: "Error",
        text: error?.message || "Failed to send reset password link",
        icon: "error",
      });
    }
  };

  const resetPassword = async () => {
    // Basic validation
    if (!pass) {
      Sweetalert({
        title: "Warning",
        text: "Please enter a new password",
        icon: "warning",
      });
      return;
    }

    const token =
      new URLSearchParams(window.location.search).get("token") || "";

    if (!token) {
      Sweetalert({
        title: "Error",
        text: "Missing reset token in URL",
        icon: "error",
      });
      return;
    }

    const { data: res, error } = await authClient.resetPassword({
      newPassword: pass, // Fixed: Was hardcoded to "password1234"
      token,
    });

    if (res?.status === true) {
      Sweetalert({
        title: "Success",
        text: "Password reset successful",
        icon: "success",
      });
      // Optional: Redirect user to login page here
    } else {
      Sweetalert({
        title: "Error",
        text: error?.message || "Failed to reset password",
        icon: "error",
      });
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Account Recovery
          </h1>
          <p className="text-sm text-muted-foreground">
            Request a reset link or enter your new password if you already have
            a token.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Request Link */}
          <div className="space-y-4 rounded-xl border bg-muted/20 p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Step 1: Request Link
            </h2>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="w-full" onClick={getPasswordResetLink}>
                Send Reset Link
              </Button>
            </div>
          </div>

          {/* Step 2: Reset Password */}
          <div className="space-y-4 rounded-xl border bg-muted/20 p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Step 2: Set New Password
            </h2>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Enter new password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
              <Button
                className="w-full"
                variant="default"
                onClick={resetPassword}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
