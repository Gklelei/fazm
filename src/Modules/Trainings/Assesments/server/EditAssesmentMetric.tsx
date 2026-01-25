"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { PenBox, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { GetAssesmentMetricsQueryType } from "../Types";
import { useFieldArray, useForm } from "react-hook-form";
import { MetricsSchema } from "../Validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useState, useTransition } from "react";
import { UpdateAssesmentMetric } from "./UpadateAssesmentMetric";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";

// Extend schema to include ID for updates
const EditSchema = MetricsSchema.extend({
  metrics: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1, "Label is required"),
      }),
    )
    .min(1, "At least one metric is required"),
});

interface Props {
  id: string;
  data: GetAssesmentMetricsQueryType[];
}

const EditAssesmentMetric = ({ data, id }: Props) => {
  const [open, setOpen] = useState(false);
  const [isLoading, startTranstion] = useTransition();
  const metric = data.find((a) => a.id === id);

  const form = useForm<z.infer<typeof EditSchema>>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      name: metric?.name || "",
      description: metric?.description || "",
      metrics: metric?.metrics.map((m) => ({ id: m.id, label: m.label })) || [
        { label: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "metrics",
  });

  const onSubmit = async (values: z.infer<typeof EditSchema>) => {
    startTranstion(async () => {
      const result = await UpdateAssesmentMetric(id, values);

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
      } else {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "An error has occurred",
        });
      }
    });
    setOpen(false);
  };

  if (!metric) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <PenBox className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0 gap-0">
        <div className="p-6 border-b">
          <SheetHeader>
            <SheetTitle>Edit Section: {metric.name}</SheetTitle>
            <SheetDescription>
              Modify the section details and manage the list of metrics.
            </SheetDescription>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-8 pb-6">
                <div className="space-y-5">
                  <FormField
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Section Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-10"
                            placeholder="e.g. Strength"
                          />
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
                        <FormLabel className="text-base font-semibold">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-10"
                            placeholder="Brief description of this section"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Separator />
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base font-semibold">
                      Metrics List
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ label: "" })}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Metric
                    </Button>
                  </div>

                  {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
                      <AlertCircle className="w-8 h-8 mb-3 opacity-40" />
                      <p className="font-medium">No metrics added yet</p>
                      <p className="text-xs">
                        Add at least one metric to save this section.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-200"
                      >
                        <div className="pt-3 text-sm font-mono text-muted-foreground w-6 text-center">
                          {idx + 1}.
                        </div>
                        <FormField
                          name={`metrics.${idx}.label`}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  className="h-10"
                                  placeholder="Metric Label"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="p-6 border-t bg-background mt-auto">
              <SheetFooter>
                <Button
                  type="submit"
                  className="w-full h-11 text-base gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2Spinner />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </Button>
              </SheetFooter>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default EditAssesmentMetric;
