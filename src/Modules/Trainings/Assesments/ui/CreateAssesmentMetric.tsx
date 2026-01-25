"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CreateAssesmentMetricAction } from "@/Modules/Trainings/Assesments/server/CreateAssesmentMetricsAction";
import { MetricsSchema } from "@/Modules/Trainings/Assesments/Validators";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash, Save, LayoutGrid, Settings2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

const AssesmentMetricBuilder = () => {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof MetricsSchema>>({
    resolver: zodResolver(MetricsSchema),
    defaultValues: {
      name: "",
      description: "",
      metrics: [{ label: "" }],
    },
  });

  const { isSubmitting } = form.formState;

  const fieldArray = useFieldArray({
    control: form.control,
    name: "metrics",
  });

  const submitHandler = async (data: z.infer<typeof MetricsSchema>) => {
    const result = await CreateAssesmentMetricAction(data);
    if (result.success) {
      Sweetalert({
        icon: "success",
        text: result.message,
        title: "Success!",
      });
      form.reset();
      setOpen(false);
    } else {
      Sweetalert({
        icon: "error",
        text: result.message,
        title: "Error",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Configure Assessment Metrics
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-112.5 p-6 shadow-xl border-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Metric Builder</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Add a new section and define its metrics.
          </p>

          <Separator className="mb-6" />

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(submitHandler)}
              className="space-y-6"
            >
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">
                      Section Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Endurance" {...field} />
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
                    <FormLabel className="font-semibold">
                      Section Description
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Endurance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">
                    Metrics
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => fieldArray.append({ label: "" })}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                <div className="max-h-75 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {fieldArray.fields.map((field, idx) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <FormField
                        name={`metrics.${idx}.label`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Metric label"
                                  className="h-9 text-sm"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        disabled={fieldArray.fields.length === 1}
                        onClick={() => fieldArray.remove(idx)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AssesmentMetricBuilder;
