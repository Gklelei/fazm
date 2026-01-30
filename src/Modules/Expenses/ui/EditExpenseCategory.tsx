"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ExpenseCategorySchema, ExpenseCategoryType } from "../Validators";
import { EditExpenseCategory } from "../Server/CreateExpenseCategory";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2Icon, PenBoxIcon } from "lucide-react";
import { GetExpenseCategoriesQuery } from "../Types";

interface Props {
  category: GetExpenseCategoriesQuery;
}

const EditExpenseCategoryDialog = ({ category }: Props) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<ExpenseCategoryType>({
    resolver: zodResolver(ExpenseCategorySchema),
    defaultValues: {
      name: category.name ?? "",
      description: category.description ?? "",
      status: (category.status as "ACTIVE" | "INACTIVE") ?? "INACTIVE",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: category.name ?? "",
      description: category.description ?? "",
      status: (category.status as "ACTIVE" | "INACTIVE") ?? "INACTIVE",
    });
  }, [open, category, form]);

  const handleSubmit = (values: ExpenseCategoryType) => {
    startTransition(async () => {
      const result = await EditExpenseCategory(values, category.id);

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });

        setOpen(false);
        router.refresh();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit category">
          <PenBoxIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update category details. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-5"
            >
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">
                      Category Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Office Supplies"
                        autoComplete="off"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                name="status"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="space-y-1.5 w-full">
                    <FormLabel className="text-sm font-medium">
                      Status
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl className="w-full">
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE" className="text-sm">
                          Active
                        </SelectItem>
                        <SelectItem value="INACTIVE" className="text-sm">
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Briefly describe what this category covers..."
                        className="resize-none text-sm min-h-20"
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending ? (
                    <>
                      <Loader2Icon className="animate-spin h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseCategoryDialog;
