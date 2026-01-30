"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ClientCreateExpenseType,
  CreateExpenseSchema,
  ServerCreateExpenseType,
} from "../Validators/CreateExpense";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Loader2, Pen } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { EditExpense } from "../Server/CreateExpense";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { GetExpensesQueryType } from "../Types";

interface Props {
  expenses: GetExpensesQueryType[];
  id: string;
}

/**
 * Convert any Date/string into YYYY-MM-DD for <input type="date" />
 */
const toDateInputValue = (value?: Date | string | null) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const EditExpenseForm = ({ expenses, id }: Props) => {
  const [open, setOpen] = useState(false);
  const { data } = UseUtilsContext();
  const [isPending, startTransition] = useTransition();

  const selectedExpense = useMemo(
    () => expenses.find((e) => e.id === id) ?? null,
    [expenses, id],
  );

  const form = useForm<ClientCreateExpenseType>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      name: selectedExpense?.name ?? "",
      description: selectedExpense?.description ?? "",
      amount:
        selectedExpense?.amount !== undefined &&
        selectedExpense?.amount !== null
          ? String(selectedExpense.amount)
          : "",
      category: selectedExpense?.category?.id ?? "",
      date: toDateInputValue(selectedExpense?.date ?? null),
    },
    mode: "onSubmit",
  });

  const syncDefaults = () => {
    form.reset({
      name: selectedExpense?.name ?? "",
      description: selectedExpense?.description ?? "",
      amount:
        selectedExpense?.amount !== undefined &&
        selectedExpense?.amount !== null
          ? String(selectedExpense.amount)
          : "",
      category: selectedExpense?.category?.id ?? "",
      date: toDateInputValue(selectedExpense?.date ?? null),
    });
  };

  const handleSubmit = (values: ClientCreateExpenseType) => {
    startTransition(async () => {
      const result = await EditExpense(
        values as unknown as ServerCreateExpenseType,
        id,
      );

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });

        setOpen(false);
      } else {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "An error has occurred",
        });
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) syncDefaults();
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Pen size={16} />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Edit expense</DialogTitle>
        </DialogHeader>

        <Card className="border-0 rounded-none">
          <CardContent className="px-6 pb-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Internet bill"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 2500"
                            inputMode="numeric"
                            {...field}
                            value={field.value as string}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value as string}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl className="w-full">
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data?.expense?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add notes or reference details..."
                          className="min-h-24 resize-none"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" className="gap-2" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseForm;
