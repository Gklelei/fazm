"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  CreateStaffSchema,
  CreateStaffSchemaType,
  EditStaffSchema,
  EditStaffSchemaType,
} from "../Validation";
import { CreateStaffAction } from "../Server/CreateStaffAction";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { GetStaffByIdQueryType } from "../types";
import { AdminEditStaffProfile } from "../Server/EditStaff";
import { LocalFsUpload } from "@/components/FsUploader/LocalFsImageUploader";
import { authClient } from "@/lib/auth-client";

interface Props {
  user?: GetStaffByIdQueryType;
}

const CreateStaffForm = ({ user }: Props) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdditting = !!user;

  type FormType = CreateStaffSchemaType | EditStaffSchemaType;
  const form = useForm<FormType>({
    resolver: zodResolver(isEdditting ? EditStaffSchema : CreateStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      role: undefined,
      image: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    form.reset({
      email: user.user.email || "",
      fullName: user.fullNames || "",
      image: user.user.image || "",
      phoneNumber: user.phoneNumber || "",
      role: user.user.role || undefined,
    });
  }, [form, user]);

  const onSubmit = (data: FormType) => {
    startTransition(async () => {
      const parsed = isEdditting
        ? EditStaffSchema.safeParse(data)
        : CreateStaffSchema.safeParse(data);

      if (!parsed.success) {
        Sweetalert({
          icon: "error",
          title: "Validation error",
          text: parsed.error.message ?? "Invalid input",
        });
        return;
      }
      if (isEdditting) {
        const res = await AdminEditStaffProfile({
          data: parsed.data as EditStaffSchemaType,
          id: user.staffId,
        });
        if (res.success) {
          Sweetalert({
            icon: "success",
            title: "Success!",
            text: res.message,
          });
          await authClient.getSession({
            fetchOptions: {
              cache: "reload",
            },
          });

          router.refresh();
          router.push("/users/staff");
        } else {
          Sweetalert({
            icon: "error",
            title: "An error has occurred",
            text: res.message,
          });
        }
      } else {
        const res = await CreateStaffAction(
          parsed.data as CreateStaffSchemaType,
        );
        if (res.success) {
          Sweetalert({
            icon: "success",
            title: "Success!",
            text: res.message,
          });
          await authClient.getSession({
            fetchOptions: {
              cache: "reload",
            },
          });
          router.refresh();
          router.push("/users/staff");
        } else {
          Sweetalert({
            icon: "error",
            title: "An error has occurred",
            text: res.message,
          });
        }
      }
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

          <CardTitle>{isEdditting ? "Edit  staff" : "Create Staff"}</CardTitle>
          <CardDescription>
            {isEdditting
              ? "Add a new staff member and assign their role"
              : "Edit your staff details"}
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
                        <FormMessage />
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
                        <FormMessage />
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
                        <FormMessage />
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
                      <FormItem className="w-full">
                        <FormLabel>Role</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl className="w-full">
                            <SelectTrigger>
                              <SelectValue placeholder="select a role" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {["COACH", "ADMIN", "DOCTOR"].map((r) => (
                              <SelectItem key={r} value={r}>
                                {r.toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!isEdditting && (
                    <FormField
                      name="password"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Password</FormLabel>
                          <FormControl className="w-full">
                            <Input
                              type="password"
                              {...field}
                              placeholder="*******"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="mt-4">
                  <FormField
                    name="image"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image</FormLabel>
                        <FormControl>
                          {/* <CloudinaryUpload
                            maxSizeMB={2}
                            value={field.value || ""}
                            onChange={field.onChange}
                          /> */}
                          <LocalFsUpload
                            onChange={(url: string) => {
                              field.onChange(url);
                            }}
                            value={field.value || ""}
                            folder="BIRTH_CERTIFICATES"
                            maxSizeMB={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2Spinner />
                ) : isEdditting ? (
                  "Save"
                ) : (
                  "Create Staff Member"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateStaffForm;
