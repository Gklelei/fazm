"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CreateStaffSchema, CreateStaffSchemaType } from "../Validation";
import { CreateStaffAction } from "../Server/CreateStaffAction";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { CloudinaryUpload } from "@/components/ImageUploader";

const CreateStaffForm = () => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CreateStaffSchemaType>({
    resolver: zodResolver(CreateStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      role: "COACH",
      image: "",
    },
  });

  const onSubmit = (data: CreateStaffSchemaType) => {
    startTransition(async () => {
      const res = await CreateStaffAction(data);

      Sweetalert({
        icon: res.success ? "success" : "error",
        title: res.success ? "User Created" : "Error",
        text: res.message,
      });

      if (res.success) router.back();
    });
  };

  return (
    <div className="max-w-full mx-auto">
      <Card>
        <CardHeader className="border-b">
          <button
            onClick={() => router.back()}
            className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <CardTitle>Create Staff</CardTitle>
          <CardDescription>
            Add a new staff member and assign their role
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* PERSONAL INFO */}
              <section>
                <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="fullName"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="phoneNumber"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* ACCOUNT */}
              <section>
                <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                  Account Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["COACH", "ADMIN", "DOCTOR"].map((r) => (
                              <SelectItem key={r} value={r}>
                                {r.toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Input type="password" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    name="image"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image</FormLabel>
                        <FormControl>
                          <CloudinaryUpload
                            maxSizeMB={2}
                            value={field.value || ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* ACTION */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? <Loader2Spinner /> : "Create Staff Member"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateStaffForm;
