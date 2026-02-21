"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericSelect } from "@/utils/ReusableSelect";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { LocalFsUpload } from "@/components/FsUploader/LocalFsImageUploader";

function calcAge(dob: Date, today = new Date()) {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function parseDob(v: unknown): Date | null {
  if (!v) return null;
  // RHF date input usually gives "YYYY-MM-DD"
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  return null;
}

const PersonalInformation = () => {
  const { control } = useFormContext();
  const { data } = UseUtilsContext();

  const dobValue = useWatch({ control, name: "dateOfBirth" });

  const ageText = useMemo(() => {
    const dob = parseDob(dobValue);
    if (!dob) return "—";
    const age = calcAge(dob);
    return age >= 0 ? `${age} years` : "—";
  }, [dobValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Personal Information
        </CardTitle>
        <CardDescription>Enter the details of the user</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="firstName"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="First name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="middleName"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Middle Name</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Middle name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="lastName"
            control={control}
            render={({ field }) => (
              <FormItem className="w-full col-span-2">
                <FormLabel>Last Name</FormLabel>
                <FormControl className="w-full">
                  <Input type="text" {...field} placeholder="Last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="dateOfBirth"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>

              {/* review display */}
              <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Review:</span>{" "}
                <span className="font-medium">Age {ageText}</span>
              </div>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="email"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email(optional)</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    placeholder="email@example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number(optional)</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} placeholder="Phone number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="batch"
            render={({ field }) => (
              <FormItem className="w-full md:col-span-2">
                <FormLabel>Batch</FormLabel>
                <FormControl className="w-full">
                  <GenericSelect
                    items={data?.batches ?? []}
                    valueKey="id"
                    labelKey="name"
                    placeholder="Assign batch"
                    label="Batches"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="profilePIcture"
          control={control}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Profile Picture</FormLabel>
              <FormControl className="w-full">
                <LocalFsUpload
                  onChange={(url: string) => field.onChange(url)}
                  value={field.value || ""}
                  folder="PROFILE"
                  maxSizeMB={2}
                />
              </FormControl>
              <FormDescription>
                Upload a profile picture for the athlete
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default PersonalInformation;
