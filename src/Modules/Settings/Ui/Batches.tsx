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
import { BatchesSchema, BatchesSchemaType } from "../Validation";
import { CreateBatches } from "../Server/Batches";

const Batches = () => {
  const [isPending, startTransition] = useTransition();
  const form = useForm<BatchesSchemaType>({
    resolver: zodResolver(BatchesSchema),
    defaultValues: {
      description: "",
      name: "",
    },
  });

  const handleSubmit = async (data: BatchesSchemaType) => {
    startTransition(async () => {
      const results = await CreateBatches(data);

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
        <CardTitle>Create Player Batch</CardTitle>
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
                  <FormLabel>Batch name</FormLabel>
                  <FormControl>
                    <Input placeholder="Batch name" {...field} />
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
                    <Textarea placeholder="Batch description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2Spinner /> : "Create Batch"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default Batches;
