"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useTransition } from "react";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import {
  TrainingLocationSchema,
  TrainingLocationSchemaType,
} from "../Validation";
import { CreateTrainingLocations } from "../Server/TrainingLocations";

const TrainingLocations = () => {
  const [isPending, startTransition] = useTransition();
  const form = useForm<TrainingLocationSchemaType>({
    resolver: zodResolver(TrainingLocationSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleSubmit = async (data: TrainingLocationSchemaType) => {
    startTransition(async () => {
      const results = await CreateTrainingLocations(data);

      if (results.success) {
        Sweetalert({
          icon: "success",
          text: results.message,
          title: "Success!",
        });
      } else if (!results.success) {
        Sweetalert({
          icon: "error",
          text: results.message,
          title: "An error has occurred",
        });
      }
    });
  };
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Create Training Location</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location name</FormLabel>
                  <FormControl>
                    <Input placeholder="Training location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Spinner /> : "Create location"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TrainingLocations;
