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
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AthletesMedical = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Medical & Emergency Information
        </CardTitle>
        <CardDescription>
          Capture athletes medical and emergency contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          name="bloodGroup"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood Group</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., O+, A-" type="text" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="allergies"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergies</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter allergies separated by commas (e.g., Peanuts, Penicillin, Pollen)"
                  className="min-h-20"
                />
              </FormControl>
              <FormDescription>
                List any allergies the athlete may have
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="medicalConditions"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Conditions</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter medical conditions separated by commas (e.g., Asthma, Diabetes, Hypertension)"
                  className="min-h-20"
                />
              </FormControl>
              <FormDescription>
                List any pre-existing medical conditions
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
          <div className="space-y-4">
            <FormField
              name="emergencyContactName"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Contact Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Full name" type="text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="emergencyContactPhone"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Phone number" type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="emergencyContactRelationship"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Parent, Spouse"
                        type="text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AthletesMedical;
