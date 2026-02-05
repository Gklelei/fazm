"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ClientFinanceSchema, ClientFinanceSchemaType } from "../Validators";
import createFinancialTransaction from "../Server/CreateTransaction";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useMemo, useTransition } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { GetAllFinanceAtheletesType, GetAllInvoicesType } from "../Type";
import { SearchSelect } from "@/utils/ReusableSelectWithSearch";
import { GenericSelect } from "@/utils/ReusableSelect";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  id?: string;
  showBack?: boolean;
  invoices: GetAllInvoicesType[];
  athletes: GetAllFinanceAtheletesType[];
}

const PEYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "MPESA_SEND_MONEY",
  "MPESA_PAYBILL",
];

const PaymentModal = ({ id, showBack, athletes, invoices }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const form = useForm<ClientFinanceSchemaType>({
    resolver: zodResolver(ClientFinanceSchema),
    defaultValues: {
      amountPaid: "",
      collectedBy: "",
      notes: "",
      paymentDate: "",
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
        Sweetalert({
          icon: "success",
          text: `${result.message}\nReceipt: ${result.receiptNumber}`,
          title: "Success!",
        });
        await queryClient.invalidateQueries({
          queryKey: ["FINANCE_TRANSACTION_DETAILS"],
        });
      } else {
        Sweetalert({ icon: "error", text: result.message, title: "Error" });
      }
    });
  };

  return (
    <Card className="max-w-2xl mx-auto border-none shadow-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Record Payment
          </CardTitle>
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
        <CardDescription>
          Enter transaction details to update player balance
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Athlete & Invoice Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!id && (
                <FormField
                  name="athleteId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Athlete</FormLabel>
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
                              <span className="text-xs opacity-70 uppercase">
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
                    <FormLabel>Target Invoice</FormLabel>
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
                            <span className="text-xs opacity-70">
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

            {/* Financial Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
              <FormField
                name="amountPaid"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid</FormLabel>
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
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Collection Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="collectedBy"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received By</FormLabel>
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
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <GenericSelect
                        placeholder="Payment types"
                        items={PEYMENT_METHODS.map((m) => ({
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
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g. Partial payment for term 2"
                      className="min-h-20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11" disabled={isPending}>
              {isPending ? <Loader2Spinner /> : "Complete Transaction"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PaymentModal;
