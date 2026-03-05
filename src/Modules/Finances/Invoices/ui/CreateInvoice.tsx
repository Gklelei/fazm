"use client";

import { useForm, useWatch } from "react-hook-form";
import {
  CreateInvoiceSchema,
  CreateInvoiceSchemaType,
  SUBSCRIPTION_INTERVAL,
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
import { useEffect, useTransition, useState } from "react";
import CreateAthleteInvoice from "../Server/CreateAthleteInvoice";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { Stepper } from "@/components/ui/stepper";

import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  athletes: AllAthletesIDQueryType[];
}

const STEPS = [
  { id: 1, title: "Target Athletes", fields: ["athleteId"] },
  {
    id: 2,
    title: "Billing Details",
    fields: ["subScriptionName", "subType", "description"],
  },
  {
    id: 3,
    title: "Pricing & Dates",
    fields: [
      "subScriptionAmount",
      "subscriptionInterval",
      "startDate",
      "dueDate",
    ],
  },
];

const CreateInvoice = ({ athletes }: Props) => {
  const [isPending, startTransistion] = useTransition();
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const { data } = UseUtilsContext();

  const form = useForm<CreateInvoiceSchemaType>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      athleteId: [],
      description: "",
      dueDate: "",
      // manual removed — start with no plan selected
      subType: "",
      startDate: new Date().toISOString().split("T")[0],
      subScriptionAmount: "",
      subscriptionInterval: "ONCE",
      subScriptionName: "",
    },
  });

  const { control, handleSubmit, setValue } = form;

  const selectedAthletes = useWatch({ control, name: "athleteId" });
  const selectedPlanId = useWatch({ control, name: "subType" });

  // Auto-fill fields when a plan is selected
  useEffect(() => {
    if (!selectedPlanId) {
      setValue("subScriptionAmount", "");
      setValue("subScriptionName", "");
      return;
    }

    const plan = data?.plans?.find((p) => p.id === selectedPlanId);

    if (plan) {
      setValue("subScriptionAmount", plan.amount.toString());
      setValue("subScriptionName", plan.name);
      // Optional:
      // setValue("subscriptionInterval", plan.interval);
    } else {
      // if plan id is stale/missing, clear
      setValue("subScriptionAmount", "");
      setValue("subScriptionName", "");
    }
  }, [selectedPlanId, data?.plans, setValue]);

  const onSubmit = async (values: CreateInvoiceSchemaType) => {
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

  const nextStep = async () => {
    const fields = STEPS[currentStep - 1].fields;
    // @ts-ignore
    const isValid = await form.trigger(fields);
    if (isValid) {
      setCurrentStep((prev: number) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () =>
    setCurrentStep((prev: number) => Math.max(prev - 1, 1));

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
          <Stepper steps={STEPS} currentStep={currentStep} />
          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-10 min-h-[400px] flex flex-col justify-between"
            >
              <div>
                <div className={currentStep === 1 ? "space-y-4" : "hidden"}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                    1. Target Athletes
                  </h3>

                  <FormField
                    name="athleteId"
                    control={control}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl className="w-full">
                          <SearchSelect
                            multiple={true}
                            items={athletes}
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Search names or batches..."
                            getValue={(a) => a.athleteId}
                            getLabel={(a) =>
                              `${a.firstName} ${a.lastName} ${a.batches?.name || ""} ${a.athleteId}`
                            }
                            getSearchValue={(a) =>
                              `${a.firstName} ${a.lastName} ${a.batches?.name || ""} ${a.athleteId}`
                            }
                            renderItem={(a) => (
                              <div className="flex flex-col py-1">
                                <span className="font-medium">
                                  {a.firstName} {a.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground uppercase">
                                  id:{a.athleteId}
                                </span>
                                <span className="text-xs text-muted-foreground uppercase">
                                  batch:{a.batches?.name}
                                </span>
                              </div>
                            )}
                          />
                        </FormControl>

                        <FormDescription className="text-xs">
                          Tip: You can use &quot;Select&quot; All in the
                          dropdown to invoice your entire list at once.
                        </FormDescription>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Invoice Core Details */}
                <div className={currentStep === 2 ? "space-y-6" : "hidden"}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                    2. Billing Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      name="subScriptionName"
                      control={control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase">
                            Invoice Title
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Term 1 Fees"
                              readOnly
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="subType"
                      control={control}
                      render={({ field }) => (
                        <FormItem className="w-full space-y-1.5">
                          <FormLabel className="text-xs font-bold uppercase">
                            Subscription plan
                          </FormLabel>

                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="Select a subscription plan" />
                              </SelectTrigger>
                            </FormControl>

                            <SelectContent className="max-h-72">
                              {(data?.plans ?? []).map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {`${i.name}-KSH${i.amount}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    name="description"
                    control={control}
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
                <div className={currentStep === 3 ? "space-y-6" : "hidden"}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                    3. Pricing & Dates
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      name="subScriptionAmount"
                      control={control}
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
                              readOnly
                              style={{ opacity: 0.8 }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="subscriptionInterval"
                      control={control}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs font-bold uppercase">
                            Interval
                          </FormLabel>
                          <FormControl className="w-full">
                            <GenericSelect
                              items={SUBSCRIPTION_INTERVAL}
                              labelKey="name"
                              valueKey="value"
                              onValueChange={field.onChange}
                              value={field.value}
                              placeholder="Frequency"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      name="startDate"
                      control={control}
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
                      control={control}
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
              </div>

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
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      type="submit"
                      className="gap-2 h-10 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={
                        selectedAthletes.length === 0 ||
                        isPending ||
                        !selectedPlanId
                      }
                    >
                      {isPending ? (
                        <Loader2Spinner />
                      ) : (
                        <>
                          Confirm and Create {selectedAthletes.length}{" "}
                          Invoice(s) <Check className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                    {!selectedPlanId && (
                      <p className="text-xs text-muted-foreground mr-2">
                        Select a subscription plan first.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateInvoice;
