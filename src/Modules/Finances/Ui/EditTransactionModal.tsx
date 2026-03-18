"use client";

import { useForm } from "react-hook-form";
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
import { Edit2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  ClientEditFinanceSchema,
  ClientEditFinanceSchemaType,
} from "../Validators";
import editFinancialTransaction from "../Server/EditTransaction";
import { useTransition, useState } from "react";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";
import { GenericSelect } from "@/utils/ReusableSelect";
import { toast } from "sonner";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "MPESA_SEND_MONEY",
  "MPESA_PAYBILL",
];

const EditTransactionModal = ({ data }: Props) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ClientEditFinanceSchemaType>({
    resolver: zodResolver(ClientEditFinanceSchema),
    defaultValues: {
      id: data.id,
      amountPaid: data.amountPaid.toString(),
      collectedBy: data.collectedBy,
      notes: data.notes || "",
      paymentDate: new Date(data.paymentDate).toISOString().split("T")[0],
      paymentType: data.paymentType,
    },
  });

  const handleSubmit = async (values: ClientEditFinanceSchemaType) => {
    startTransition(async () => {
      const result = await editFinancialTransaction(values);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit2 className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight">
              Edit Transaction
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Update the transaction details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
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
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2Spinner />
                    Processing...
                  </>
                ) : (
                  "Update Transaction"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionModal;
