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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useTransition } from "react";
import { signIn } from "@/lib/auth-client";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { Eye, EyeOff } from "lucide-react";
// import { PasswordResetDialog } from "./ForgotPassword";

const SignInForm = () => {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<signInSchemaType>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
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
          title: "An error has occurred",
          showCloseButton: true,
        });
        return;
      }

      Sweetalert({
        icon: "success",
        text: "Congratulations! Authenticated",
        title: "Success!",
      });

      form.reset();
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Sign In</CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Email */}
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
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

              {/* Submit */}
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? <Loader2Spinner /> : "Sign In"}
              </Button>
              {/* <PasswordResetDialog
                redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/reset-password`}
                trigger={
                  <Button variant="link" className="px-0">
                    Forgot Password
                  </Button>
                }
              /> */}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInForm;
