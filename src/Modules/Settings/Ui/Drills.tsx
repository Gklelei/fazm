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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { DrillsSchema, DrillsSchemaType } from "../Validation";
import { CreateDrills } from "../Server/Drills";

const Drills = () => {
  const [isPending, startTransition] = useTransition();
  const form = useForm<DrillsSchemaType>({
    resolver: zodResolver(DrillsSchema),
    defaultValues: {
      description: "",
      name: "",
    },
  });

  const handleSubmit = async (data: DrillsSchemaType) => {
    startTransition(async () => {
      const results = await CreateDrills(data);

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
        <CardTitle>Create Training Drill</CardTitle>
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
                  <FormLabel>Drill name</FormLabel>
                  <FormControl>
                    <Input placeholder="Drill name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Drill description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Spinner /> : "Create Drill"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default Drills;
