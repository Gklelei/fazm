"use client";
import { useFormContext } from "react-hook-form";
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
// import { CloudinaryUpload } from "@/components/ImageUploader";
import { LocalFsUpload } from "@/components/FsUploader/LocalFsImageUploader";
// import { ChangeEvent } from "react";
// import { file } from "zod";

const PersonalInformation = () => {
  const { control } = useFormContext();
  const { data } = UseUtilsContext();

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
                <FormControl className="w-full ">
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
                  onChange={(url: string) => {
                    field.onChange(url);
                  }}
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
