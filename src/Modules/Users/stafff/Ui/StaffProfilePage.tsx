"use client";

import { useState } from "react";
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
import { CloudinaryUpload } from "@/components/ImageUploader";

import { GetUserProfileType } from "../types";
import {
  AccountSettingSchema,
  AccountSettingSchemaType,
} from "../Validation/Profile";

interface Props {
  data: GetUserProfileType;
}

const StaffProfilePage = ({ data }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AccountSettingSchemaType>({
    resolver: zodResolver(AccountSettingSchema),
    defaultValues: {
      email: data.email || "",
      fullNames: data.name || "",
      phoneNumber: data.staff?.phoneNumber || "",
      profilePicture: data.image || "",
      role: "",
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <div className="container max-w-5xl py-6 lg:py-10 space-y-2">
      <div className="flex flex-col gap-1 px-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Update your account details and how others see you on the platform.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-2">
          <div className="grid gap-8">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  This photo will be displayed on your profile and staff
                  directory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                      <div className="shrink-0">
                        <CloudinaryUpload
                          value={field.value || ""}
                          onChange={(url) => {
                            field.onChange(url);
                            setIsLoading(true);
                            setTimeout(() => setIsLoading(false), 1000);
                          }}
                          disabled={isSubmitting || isLoading}
                          maxSizeMB={2}
                          folder="profile-pictures"
                        />
                      </div>
                    )}
                  />
                  <div className="flex-1 space-y-2 pt-2">
                    <div className="grid gap-1">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Image Requirements
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                        <li>JPG, PNG or WebP formats supported</li>
                        <li>Maximum file size of 2MB</li>
                        <li>
                          Square aspect ratio recommended (e.g. 400x400px)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
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
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          disabled={isSubmitting}
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
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@academy.com"
                          {...field}
                          disabled={isSubmitting}
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
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+254..."
                          {...field}
                          disabled={isSubmitting}
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
                        Staff Role
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="bg-muted/50 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-dashed shadow-none bg-muted/20">
              <CardContent className="py-2">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Account Tenure
                    </span>
                    <span className="text-sm italic">
                      Member since {format(new Date(data.createdAt), "PPP")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => form.reset()}
              disabled={isSubmitting || isLoading}
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full sm:w-auto min-w-35"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
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
