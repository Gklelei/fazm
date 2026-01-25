"use client";

import { useForm } from "react-hook-form";
import { ExpenseCategorySchema, ExpenseCategoryType } from "../Validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PlusIcon } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTransition } from "react";
import { CreateExpenseCategoryAction } from "../Server/CreateExpenseCategory";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

const CreateExpenseCategory = () => {
  const [isPending, startTransistion] = useTransition();
  const form = useForm<ExpenseCategoryType>({
    resolver: zodResolver(ExpenseCategorySchema),
    defaultValues: {
      description: "",
      name: "",
      status: "INACTIVE",
    },
  });

  const handleSubmit = async (values: ExpenseCategoryType) => {
    startTransistion(async () => {
      const result = await CreateExpenseCategoryAction(values);

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
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Category
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-lg font-semibold">
            Create New Category
          </SheetTitle>
          <SheetDescription className="text-sm">
            Define a new category to organize your expenses effectively.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 py-4 overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-5"
            >
              {/* Name Field */}
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
                        placeholder="e.g., Office Supplies, Travel Expenses"
                        autoComplete="off"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Status Field */}
              <FormField
                name="status"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">
                      Status
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
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
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? (
                  <Loader2Icon className="animate-spin mr-2 h-5 w-5" />
                ) : (
                  "Create Category"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateExpenseCategory;
