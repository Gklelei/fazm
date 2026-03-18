"use client";

import { useForm } from "react-hook-form";
import { signInSchema, signInSchemaType } from "./Validation/AuthSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";
import { signIn } from "@/lib/auth-client";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { Eye, EyeOff } from "lucide-react";
import SendPasswordResetLinkButton from "./SendPasswordResetLinkButton";
import Image from "next/image";

const SignInForm = () => {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<signInSchemaType>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = async (data: signInSchemaType) => {
    startTransition(async () => {
      const { error } = await signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/",
      });

      if (error) {
        Sweetalert({
          icon: "error",
          text:
            (error.message as string) ||
            (error.code as string) ||
            "Failed to authenticate user",
          title: "Authentication failed",
          showCloseButton: true,
        });
        return;
      }

      Sweetalert({ icon: "success", text: "Welcome back!", title: "Success!" });
      form.reset();
    });
  };

  return (
    /* Full-page background — Fazam hero image, single unified overlay */
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <Image
        src="/login-hero.png"
        alt=""
        fill
        className="object-cover object-center"
        priority
      />
      {/* Single dark overlay — no split, one seamless canvas */}
      <div className="absolute inset-0 bg-[#050d1a]/80" />

      {/* Centered form card */}
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-xl">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/Fazam Logo-BG.png"
            alt="Fazam Football Academy"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <div className="text-center">
            <p className="text-base font-black uppercase tracking-widest text-white">
              Fazam FC
            </p>
            <p className="text-xs uppercase tracking-widest text-yellow-400">
              Football Academy Portal
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Sign in to your academy dashboard
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-white/80">
                    Email address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      className="h-11 border-white/10 bg-white/10 text-white placeholder:text-white/30 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/10"
                    />
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
                    <FormLabel className="text-sm font-medium text-white/80">
                      Password
                    </FormLabel>
                    <SendPasswordResetLinkButton
                      showEmailPopUp={true}
                      redirectTo="/res-password"
                      className="h-auto p-0 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                      buttonText="Forgot password?"
                    />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 border-white/10 bg-white/10 pr-10 text-white placeholder:text-white/30 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/80"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full bg-yellow-400 font-semibold text-[#050d1a] shadow-lg shadow-yellow-400/10 hover:bg-yellow-300 active:scale-[0.98] transition-all"
            >
              {isPending ? <Loader2Spinner /> : "Sign in →"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-xs text-white/30">
          Having trouble? Contact your system administrator.
        </p>
      </div>
    </div>
  );
};

export default SignInForm;
