"use client";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
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

const AthletesGuardian = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Guardian Information
        </CardTitle>
        <CardDescription>Enter athlete guardian details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          name="guardianFullNames"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guardian Full Names</FormLabel>
              <FormControl>
                <Input {...field} placeholder="John Doe" type="text" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="guardianRelationShip"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Father, Mother, Guardian"
                  type="text"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="guardianEmail"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="guardian@example.com"
                    type="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="guardianPhoneNumber"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Phone number" type="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AthletesGuardian;
