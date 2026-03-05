"use client";

import { z } from "zod";
import { ClientTrainingSessionSchema } from "../Validators/TrainingSessions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { GenericSelect } from "@/utils/ReusableSelect";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { PageLoader } from "@/utils/Alerts/PageLoader";
import { CreateTrainingSession as ServerCreateTrainingSession } from "../Server/CreateTrainingSession";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import {
  ArrowLeftCircle,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stepper } from "@/components/ui/stepper";
import { SortableDrillList } from "./SortableDrillList";

const STEPS = [
  {
    id: 1,
    title: "Basic Info",
    fields: ["title", "date", "duration", "description"],
  },
  { id: 2, title: "Session Details", fields: ["location", "batch", "drills"] },
  { id: 3, title: "Personnel", fields: ["coach", "note"] },
];

const CreateTrainingSession = () => {
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1);
  const { data, utilsLoading } = UseUtilsContext();
  const router = useRouter();

  const form = useForm<z.input<typeof ClientTrainingSessionSchema>>({
    resolver: zodResolver(ClientTrainingSessionSchema),
    defaultValues: {
      batch: "",
      coach: "",
      date: "",
      description: "",
      drills: [],
      duration: 0,
      location: "",
      note: "",
      title: "",
    },
  });

  const handleSubmit = async (
    data: z.input<typeof ClientTrainingSessionSchema>,
  ) => {
    console.log(data);
    startTransition(async () => {
      const result = await ServerCreateTrainingSession(data);

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
        form.reset();
        return;
      } else if (!result.success) {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "An error has occurred",
        });
        return;
      }
    });
  };

  const nextStep = async () => {
    const fields = STEPS[currentStep - 1].fields;
    // @ts-ignore
    const isValid = await form.trigger(fields);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  if (utilsLoading) {
    return <PageLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Create Training Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Button type="button" onClick={() => router.back()}>
            <ArrowLeftCircle />
          </Button>
        </div>
        <Stepper steps={STEPS} currentStep={currentStep} />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 min-h-[350px] flex flex-col justify-between"
          >
            <div>
              {/* Basic Information Section */}
              <div className={currentStep === 1 ? "space-y-4" : "hidden"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-sm font-medium">
                          Session Title
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter session title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date & Time */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Date & Time
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Duration */}
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Duration (minutes)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="e.g., 90"
                            {...field}
                            value={field.value as number}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter session description"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Session Details Section */}
              <div className={currentStep === 2 ? "space-y-4" : "hidden"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Location
                        </FormLabel>
                        <FormControl>
                          <GenericSelect
                            items={data?.locations || []}
                            valueKey="id"
                            labelKey="name"
                            placeholder="Select location"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        {data?.locations.length === 0 && (
                          <span className="text-sm text-red-500">
                            No locations available contact admin
                          </span>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Batch */}
                  <FormField
                    control={form.control}
                    name="batch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Batch
                        </FormLabel>
                        <FormControl>
                          <GenericSelect
                            items={data?.batches || []}
                            valueKey="id"
                            labelKey="name"
                            placeholder="Select batch"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        {data?.batches.length === 0 && (
                          <span className="text-sm text-red-500">
                            No batches available contact admin
                          </span>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Drills */}
                  <FormField
                    control={form.control}
                    name="drills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Drills
                        </FormLabel>
                        <FormControl>
                          <SortableDrillList
                            availableDrills={data?.drills || []}
                            selectedDrillIds={field.value || []}
                            onChange={(newOrder) => field.onChange(newOrder)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                </div>
              </div>

              {/* Personnel Section */}
              <div className={currentStep === 3 ? "space-y-4" : "hidden"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Coach */}
                  <FormField
                    control={form.control}
                    name="coach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Coach
                        </FormLabel>
                        <FormControl>
                          <GenericSelect
                            items={data?.coaches || []}
                            valueKey="staffId"
                            labelKey="fullNames"
                            placeholder="Select coach"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        {data?.coaches.length === 0 && (
                          <span className="text-sm text-red-500">
                            No coaches available contact admin
                          </span>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Notes */}
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Additional Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes (optional)"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center pt-8 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isPending}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={nextStep} className="gap-2">
                  Next Step <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="gap-2 w-full md:w-auto bg-primary text-primary-foreground"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2Spinner />
                  ) : (
                    <>
                      Create Training Session <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateTrainingSession;
