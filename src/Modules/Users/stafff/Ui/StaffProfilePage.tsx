/* eslint-disable react-hooks/purity */
"use client";

import { useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Mail,
  User,
  Phone,
  Briefcase,
  Calendar,
  ImageIcon,
  Save,
  RotateCcw,
  Monitor,
  Globe,
  Clock,
} from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { GetUserProfileType } from "../types";
import {
  AccountSettingSchema,
  AccountSettingSchemaType,
} from "../Validation/Profile";
import { LocalFsUpload } from "@/components/FsUploader/LocalFsImageUploader";
import { EditStaffProfile } from "../Server/EditStaff";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

interface Props {
  data: GetUserProfileType;
}

const StaffProfilePage = ({ data }: Props) => {
  const [isPending, startTransistion] = useTransition();
  const defaultValues = useMemo<AccountSettingSchemaType>(
    () => ({
      email: data.email || "",
      fullNames: data.name || "",
      phoneNumber: data.staff?.phoneNumber || "",
      profilePicture: data.image || "",
      role: data.role || "",
    }),
    [data],
  );

  const form = useForm<AccountSettingSchemaType>({
    resolver: zodResolver(AccountSettingSchema),
    defaultValues,
  });

  const { isDirty } = form.formState;

  const onSubmit = async (values: AccountSettingSchemaType) => {
    startTransistion(async () => {
      const result = await EditStaffProfile({ data: values, id: data.id });

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
      } else {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "An error has occurred",
        });
      }
    });
  };

  const resetToInitial = () => {
    form.reset(defaultValues);
  };

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 py-6 lg:py-10 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Update your account details and how others see you on the platform.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                This photo will be displayed on your profile and staff
                directory.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <FormField
                  control={form.control}
                  name="profilePicture"
                  render={({ field }) => (
                    <FormItem className="shrink-0">
                      <FormControl>
                        <LocalFsUpload
                          onChange={(url: string) => field.onChange(url)}
                          value={field.value || ""}
                          folder="PROFILE"
                          maxSizeMB={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    Image requirements
                  </div>

                  <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                    <li>JPG, PNG, or WebP formats supported</li>
                    <li>Maximum file size: 2MB</li>
                    <li>Square aspect ratio recommended (e.g. 400×400)</li>
                  </ul>

                  <Separator />

                  <p className="text-xs text-muted-foreground">
                    Tip: Use a clear headshot to make it easier for athletes and
                    staff to recognize you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic identity details for your staff account.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Full name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@academy.com"
                        {...field}
                        readOnly
                        disabled
                        className="cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Phone number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+254..."
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Staff role
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        disabled
                        className="cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Sessions</CardTitle>
                  <CardDescription>
                    Active sessions for this account.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="h-6">
                  {data.sessions.length} active
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {data.sessions.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No active sessions.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="grid grid-cols-12 gap-0 border-b bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <div className="col-span-12 md:col-span-4 px-3 py-2 flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5" />
                      Device / Agent
                    </div>
                    <div className="col-span-6 md:col-span-3 px-3 py-2 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" />
                      IP Address
                    </div>
                    <div className="col-span-6 md:col-span-2 px-3 py-2 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Started
                    </div>
                    <div className="col-span-12 md:col-span-3 px-3 py-2">
                      Expires
                    </div>
                  </div>

                  {data.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="grid grid-cols-12 border-b last:border-b-0"
                    >
                      <div className="col-span-12 md:col-span-4 px-3 py-3">
                        <div className="text-sm font-medium truncate">
                          {session.userAgent || "Unknown device"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Session ID: {session.id}
                        </div>
                      </div>

                      <div className="col-span-6 md:col-span-3 px-3 py-3">
                        <div className="text-sm">
                          {session.ipAddress || "—"}
                        </div>
                      </div>

                      <div className="col-span-6 md:col-span-2 px-3 py-3">
                        <div className="text-sm">
                          {format(new Date(session.createdAt), "PPP")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.createdAt), "p")}
                        </div>
                      </div>

                      <div className="col-span-12 md:col-span-3 px-3 py-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm">
                            {format(new Date(session.expiresAt), "PPP")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(session.expiresAt), "p")}
                          </div>
                        </div>

                        <Badge
                          variant={
                            new Date(session.expiresAt).getTime() > Date.now()
                              ? "outline"
                              : "secondary"
                          }
                          className="shrink-0"
                        >
                          {new Date(session.expiresAt).getTime() > Date.now()
                            ? "Active"
                            : "Expired"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account tenure */}
          <Card className="border-dashed shadow-none bg-muted/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Account tenure
                  </span>
                  <span className="text-sm">
                    Member since{" "}
                    <span className="font-medium">
                      {format(new Date(data.createdAt), "PPP")}
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={resetToInitial}
              disabled={isPending || !isDirty}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>

            <Button
              type="submit"
              disabled={isPending || !isDirty}
              className="w-full sm:w-auto min-w-40"
            >
              {isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default StaffProfilePage;
