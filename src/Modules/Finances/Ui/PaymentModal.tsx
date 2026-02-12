"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PlusIcon, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ClientFinanceSchema, ClientFinanceSchemaType } from "../Validators";
import createFinancialTransaction from "../Server/CreateTransaction";
import { useMemo, useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { GetAllFinanceAtheletesType, GetAllInvoicesType } from "../Type";
import { SearchSelect } from "@/utils/ReusableSelectWithSearch";
import { GenericSelect } from "@/utils/ReusableSelect";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  id?: string;
  showBack?: boolean;
  invoices: GetAllInvoicesType[];
  athletes: GetAllFinanceAtheletesType[];
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "MPESA_SEND_MONEY",
  "MPESA_PAYBILL",
];

const PaymentDialog = ({
  id,
  showBack,
  athletes,
  invoices,
  trigger,
  defaultOpen = false,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const form = useForm<ClientFinanceSchemaType>({
    resolver: zodResolver(ClientFinanceSchema),
    defaultValues: {
      amountPaid: "",
      collectedBy: "",
      notes: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentType: "MPESA_SEND_MONEY",
      athleteId: id || "",
      invoiceId: "",
    },
  });

  const watchedAthleteId = useWatch({
    control: form.control,
    name: "athleteId",
  });

  const filteredInvoices = useMemo(() => {
    if (!watchedAthleteId) return [];
    return invoices.filter(
      (f) =>
        f.athleteId === watchedAthleteId &&
        f.status !== "PAID" &&
        f.status !== "CANCELED",
    );
  }, [watchedAthleteId, invoices]);

  const handleSubmit = async (data: ClientFinanceSchemaType) => {
    const values = { ...data, athleteId: id ?? data.athleteId };
    startTransition(async () => {
      const result = await createFinancialTransaction(values);
      if (result.success) {
        toast.success(`${result.message}\nReceipt: ${result.receiptNumber}`);
        await queryClient.invalidateQueries({
          queryKey: ["FINANCE_TRANSACTION_DETAILS"],
        });
        form.reset({
          amountPaid: "",
          collectedBy: "",
          notes: "",
          paymentDate: new Date().toISOString().split("T")[0],
          paymentType: "MPESA_SEND_MONEY",
          athleteId: id || "",
          invoiceId: "",
        });
      } else {
        toast.error(result.message);
      }
    });
  };

  const defaultTrigger = trigger || (
    <Button className="gap-2">
      <PlusIcon className="h-4 w-4" />
      Record Payment
    </Button>
  );

  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Record Payment
            </DialogTitle>
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
          </div>
          <DialogDescription className="text-sm">
            Enter transaction details to update player balance
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!id && (
                <FormField
                  name="athleteId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Athlete
                      </FormLabel>
                      <FormControl>
                        <SearchSelect
                          items={athletes}
                          value={field.value}
                          onSelect={field.onChange}
                          placeholder="Search athlete..."
                          getValue={(a) => a.athleteId}
                          getLabel={(a) => `${a.firstName} ${a.lastName}`}
                          getSearchValue={(a) =>
                            `${a.firstName} ${a.lastName} ${a.athleteId}`
                          }
                          renderItem={(a) => (
                            <div className="flex flex-col py-1">
                              <span className="font-medium">
                                {a.firstName} {a.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase">
                                {a.athleteId}
                              </span>
                            </div>
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                name="invoiceId"
                control={form.control}
                render={({ field }) => (
                  <FormItem className={id ? "col-span-2" : ""}>
                    <FormLabel className="text-sm font-medium">
                      Target Invoice
                    </FormLabel>
                    <FormControl>
                      <SearchSelect
                        items={filteredInvoices}
                        value={field.value}
                        onSelect={field.onChange}
                        placeholder="Select unpaid invoice"
                        getValue={(a) => a.invoiceNumber}
                        getLabel={(a) => a.description || "No Description"}
                        getSearchValue={(a) => a.invoiceNumber}
                        renderItem={(a) => (
                          <div className="flex flex-col py-1">
                            <span className="font-medium">{a.description}</span>
                            <span className="text-xs text-muted-foreground">
                              Bal: {Number(a.amountDue) - Number(a.amountPaid)}{" "}
                              | {a.invoiceNumber}
                            </span>
                          </div>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <FormField
                name="amountPaid"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Amount Paid
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="0.00"
                        type="number"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="paymentDate"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Payment Date
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="collectedBy"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Received By
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Staff name"
                        type="text"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="paymentType"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-sm font-medium">
                      Payment Method
                    </FormLabel>
                    <FormControl className="w-full">
                      <GenericSelect
                        placeholder="Payment types"
                        items={PAYMENT_METHODS.map((m) => ({
                          id: m,
                          label: m.replace(/_/g, " "),
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        labelKey="label"
                        valueKey="id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Additional Notes
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g. Partial payment for term 2"
                      className="min-h-24 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() =>
                  form.reset({
                    amountPaid: "",
                    collectedBy: "",
                    notes: "",
                    paymentDate: new Date().toISOString().split("T")[0],
                    paymentType: "MPESA_SEND_MONEY",
                    athleteId: id || "",
                    invoiceId: "",
                  })
                }
              >
                Clear
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2Spinner />
                    Processing...
                  </>
                ) : (
                  "Complete Transaction"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
