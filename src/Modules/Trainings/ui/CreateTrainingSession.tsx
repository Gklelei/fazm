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
import { ArrowLeftCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const CreateTrainingSession = () => {
  const [isPending, startTransition] = useTransition();
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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Basic Information Section */}
            <div className="space-y-4">
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
            <div className="space-y-4">
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
                        <div className="flex flex-col space-y-1">
                          {data?.drills.map((drill) => (
                            <label
                              key={drill.id}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                value={drill.id}
                                checked={
                                  field.value?.includes(drill.id) || false
                                }
                                onChange={() => {
                                  if (field.value?.includes(drill.id)) {
                                    field.onChange(
                                      field.value.filter((v) => v !== drill.id),
                                    );
                                  } else {
                                    field.onChange([
                                      ...(field.value || []),
                                      drill.id,
                                    ]);
                                  }
                                }}
                              />
                              {drill.name}
                            </label>
                          ))}
                        </div>
                      </FormControl>
                      {data?.drills.length === 0 && (
                        <span className="text-sm text-red-500">
                          No drills available, contact admin
                        </span>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
              </div>
            </div>

            {/* Personnel Section */}
            <div className="space-y-4">
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

            {/* Submit Button */}
            <div className="pt-4">
              <Button type="submit" className="w-full md:w-auto">
                {isPending ? <Loader2Spinner /> : "Create Training Session"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateTrainingSession;
