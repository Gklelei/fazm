"use client";
import { useForm } from "react-hook-form";
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
import { signUp } from "@/lib/auth-client";
import { SignUpSchema, SignUpSchemaType } from "./Validation/AuthSchema";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

const SignUp = () => {
  const form = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSignup = async (data: SignUpSchemaType) => {
    try {
      const { error } = await signUp.email({
        email: data.email,
        password: data.password,
        name: "lelei",
        // callbackURL: "/sign-in",
      });

      if (error) {
        Sweetalert({
          icon: "error",
          showCloseButton: true,
          text: "Failed to create the account",
          title: "An error has occurred",
        });
        return;
      }

      Sweetalert({
        icon: "success",
        text: "Congratulations! Your account has been created succecsifully",
        title: "Success!",
      });
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSignup)}>
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  {...field}
                  placeholder="Enter your email address"
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  placeholder="Enter your password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Sign Up</Button>
      </form>
    </Form>
  );
};

export default SignUp;
