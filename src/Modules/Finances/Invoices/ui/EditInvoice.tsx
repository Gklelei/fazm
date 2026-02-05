"use client";

import { InvoiceEditType } from "../Types";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import {
  CreateInvoiceSchema,
  CreateInvoiceSchemaType,
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_TYPES,
} from "../Validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GenericSelect } from "@/utils/ReusableSelect";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTransition } from "react";
import EditInvoiceAction from "../Server/EditInvoice";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useRouter } from "next/navigation";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { ArrowLeft } from "lucide-react";

interface props {
  data: InvoiceEditType;
}

function toInputDate(value: unknown): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

const EditInvoice = ({ data }: props) => {
  const [isPending, startTransistion] = useTransition();
  const router = useRouter();

  console.log({ data });

  const form = useForm<CreateInvoiceSchemaType>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      athleteId: [data.athlete.athleteId || ""],
      description: data.description ?? "",
      dueDate: data.dueDate
        ? new Date(data.dueDate).toISOString().split("T")[0]
        : "",
      startDate: toInputDate(data.periodStart),
      // dueDate: "",
      // startDate: "",

      subScriptionAmount: String(data.amountDue) || "",
      subscriptionInterval:
        (data.subscriptionPlan?.interval as
          | "MONTHLY"
          | "WEEKLY"
          | "DAILY"
          | "ONCE") || "ONCE",
      subScriptionName: data.subscriptionPlan?.name,
      subType: data.type || "MANUAL",
    },
  });

  async function handleSubmit(values: CreateInvoiceSchemaType) {
    startTransistion(async () => {
      const result = await EditInvoiceAction({
        data: values,
        invoiceId: data.invoiceNumber,
      });

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message || "Invoice Updated",
          title: "Success!",
        });
        router.push("/finances/invoice");
      } else {
        Sweetalert({
          icon: "error",
          text: result.message || "Internal server error",
          title: "An error has occurred",
        });
      }
    });
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto px-4">
        <Card className="shadow-sm border">
          <CardHeader>
            <Button
              type="button"
              variant={"ghost"}
              onClick={() => router.back()}
            >
              <ArrowLeft />
              Back
            </Button>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form
                className="space-y-12"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center border">
                      <span className="text-xs">1</span>
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Target Athletes
                    </h3>
                  </div>

                  <FormField
                    name="athleteId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Athlete Selection
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              disabled
                              className="pl-3 pr-10 py-2"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="border-t"></div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center border">
                      <span className="text-xs">2</span>
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Billing Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      name="subScriptionName"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Invoice Title
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Term 1 Fees"
                              className="h-11"
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="subType"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Category
                          </FormLabel>
                          <GenericSelect
                            items={SUBSCRIPTION_TYPES}
                            labelKey="name"
                            valueKey="value"
                            placeholder="Select Category"
                            onValueChange={field.onChange}
                            value={field.value}
                            className="h-11"
                            disabled
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Internal Notes
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Optional description..."
                            rows={4}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="border-t"></div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center border">
                      <span className="text-xs">3</span>
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Pricing & Dates
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      name="subScriptionAmount"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                            Amount (KES)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                KES
                              </span>
                              <Input
                                {...field}
                                type="number"
                                placeholder="0.00"
                                className="h-11 pl-12"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="subscriptionInterval"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                            Interval
                          </FormLabel>
                          <GenericSelect
                            items={SUBSCRIPTION_INTERVAL}
                            labelKey="name"
                            valueKey="value"
                            onValueChange={field.onChange}
                            value={field.value}
                            placeholder="Frequency"
                            className="h-11"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      name="startDate"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                            Start Date
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="dueDate"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                            Due Date
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="pt-8">
                  <Button
                    type="submit"
                    className="w-full h-12 font-semibold uppercase tracking-wider text-sm"
                    disabled={isPending}
                  >
                    {isPending ? <Loader2Spinner /> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditInvoice;
