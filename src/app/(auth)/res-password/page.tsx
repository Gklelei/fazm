"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2, Eye, EyeOff } from "lucide-react";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  const resetPassword = async () => {
    if (!pass || !confirmPass) {
      Sweetalert({
        title: "Warning",
        text: "Please fill in all fields",
        icon: "warning",
      });
      return;
    }

    if (pass !== confirmPass) {
      Sweetalert({
        title: "Mismatch",
        text: "Passwords do not match",
        icon: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await authClient.resetPassword({
        newPassword: pass,
        token: token || "",
      });

      if (error) {
        Sweetalert({
          title: "Error",
          text: error.message || "Failed to reset password",
          icon: "error",
        });
      } else {
        await Sweetalert({
          title: "Success",
          text: "Password reset successful. You can now login.",
          icon: "success",
        });
        router.push("/sign-in");
      }
    } catch (err) {
      Sweetalert({
        title: "Error",
        text: "An unexpected error occurred",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pass">New Password</Label>
          <div className="relative">
            <Input
              id="pass"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPass">Confirm Password</Label>
          <Input
            id="confirmPass"
            type="password"
            placeholder="••••••••"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button
          className="w-full"
          variant="default"
          onClick={resetPassword}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </div>
    </div>
  );
};

const ResetPasswordPage = () => {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
};

export default ResetPasswordPage;
