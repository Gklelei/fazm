"use client";

import { useForm, useWatch } from "react-hook-form";
import {
  CreateInvoiceSchema,
  CreateInvoiceSchemaType,
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_TYPES,
} from "../Validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GenericSelect } from "@/utils/ReusableSelect";
import { AllAthletesIDQueryType } from "../Types";
import { SearchSelect } from "@/utils/ReusableSelectWithSearch";
import { Separator } from "@/components/ui/separator";
import { useTransition } from "react";
import CreateAthleteInvoice from "../Server/CreateAthleteInvoice";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";

interface Props {
  athletes: AllAthletesIDQueryType[];
}

const CreateInvoice = ({ athletes }: Props) => {
  const [isPending, startTransistion] = useTransition();
  const router = useRouter();
  const form = useForm<CreateInvoiceSchemaType>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      athleteId: [],
      description: "",
      dueDate: "",
      subType: "MANUAL",
      startDate: new Date().toISOString().split("T")[0],
      subScriptionAmount: "",
      subscriptionInterval: "ONCE",
      subScriptionName: "",
    },
  });

  const selectedAthletes = useWatch({
    control: form.control,
    name: "athleteId",
  });

  const handleSubmit = async (values: CreateInvoiceSchemaType) => {
    startTransistion(async () => {
      const result = await CreateAthleteInvoice(values);
      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
      }
    });
  };

  return (
    <div className="max-w-full mx-auto py-8 px-4">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold tracking-tight ">
              Generate Invoices
            </CardTitle>
            {selectedAthletes.length > 0 && (
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {selectedAthletes.length} Selected
              </div>
            )}
            <Button onClick={() => router.back()} variant={"ghost"}>
              <ArrowLeft />
              Back
            </Button>
          </div>
          <CardDescription>
            Create individual or bulk billing statements for athletes.
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-10"
            >
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  1. Target Athletes
                </h3>
                <FormField
                  name="athleteId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <SearchSelect
                          multiple={true}
                          items={athletes}
                          value={field.value}
                          onSelect={field.onChange}
                          placeholder="Search names or batches..."
                          getValue={(a) => a.athleteId}
                          getLabel={(a) =>
                            `${a.firstName} ${a.lastName} ${a.batches?.name || ""}`
                          }
                          getSearchValue={(a) =>
                            `${a.firstName} ${a.lastName} ${a.batches?.name || ""}`
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Tip: You can use &quot;Select&quot; All in the dropdown
                        to invoice your entire list at once.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Invoice Core Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  2. Billing Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="subScriptionName"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">
                          Invoice Title
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Term 1 Fees" />
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
                        <FormLabel className="text-xs font-bold uppercase">
                          Category
                        </FormLabel>
                        <GenericSelect
                          items={SUBSCRIPTION_TYPES}
                          labelKey="name"
                          valueKey="value"
                          placeholder="Select Category"
                          onValueChange={field.onChange}
                          value={field.value}
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
                      <FormLabel className="text-xs font-bold uppercase">
                        Internal Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="resize-none min-h-20"
                          placeholder="Optional description..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing & Dates */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  3. Pricing & Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="subScriptionAmount"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">
                          Amount (KES)
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="0.00"
                            className="font-mono"
                          />
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
                        <FormLabel className="text-xs font-bold uppercase">
                          Interval
                        </FormLabel>
                        <GenericSelect
                          items={SUBSCRIPTION_INTERVAL}
                          labelKey="name"
                          valueKey="value"
                          onValueChange={field.onChange}
                          value={field.value}
                          placeholder="Frequency"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="startDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">
                          Start Date
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
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
                        <FormLabel className="text-xs font-bold uppercase">
                          Due Date
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={selectedAthletes.length === 0 || isPending}
                >
                  {isPending ? (
                    <Loader2Spinner />
                  ) : (
                    `Confirm and Create ${selectedAthletes.length} Invoice(s)`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateInvoice;
