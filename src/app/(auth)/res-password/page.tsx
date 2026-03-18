"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) router.push("/sign-in");
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
    if (pass.length < 8) {
      Sweetalert({
        title: "Too short",
        text: "Password must be at least 8 characters",
        icon: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
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
          title: "Done!",
          text: "Password updated. You can now sign in.",
          icon: "success",
        });
        router.push("/sign-in");
      }
    } catch {
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

  const mismatch = confirmPass.length > 0 && pass !== confirmPass;

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-xl">
      {/* Logo only */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/Fazam Logo-BG.png"
          alt="Fazam Football Academy"
          width={90}
          height={90}
          className="drop-shadow-2xl"
        />
      </div>

      <div className="space-y-4">
        {/* New password */}
        <div className="relative">
          <Input
            type={showPass ? "text" : "password"}
            placeholder="New password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            disabled={loading}
            className="h-11 border-white/10 bg-white/10 pr-10 text-white placeholder:text-white/40 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/10"
          />
          <button
            type="button"
            onClick={() => setShowPass((p) => !p)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/80"
            tabIndex={-1}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Confirm password */}
        <div>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              disabled={loading}
              className={`h-11 border-white/10 bg-white/10 pr-10 text-white placeholder:text-white/40 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/10 ${
                mismatch ? "border-red-500/60" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/80"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mismatch && (
            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
          )}
        </div>

        <Button
          className="h-11 w-full bg-yellow-400 font-semibold text-[#050d1a] hover:bg-yellow-300 active:scale-[0.98] transition-all shadow-lg shadow-yellow-400/10 disabled:opacity-60"
          onClick={resetPassword}
          disabled={loading || mismatch}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Reset password"
          )}
        </Button>

        <Link
          href="/sign-in"
          className="flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

const ResetPasswordPage = () => (
  <div className="relative flex min-h-screen items-center justify-center">
    <Image
      src="/login-hero.png"
      alt=""
      fill
      className="object-cover object-center"
      priority
    />
    <div className="absolute inset-0 bg-[#050d1a]/80" />

    <div className="relative z-10">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  </div>
);

export default ResetPasswordPage;
