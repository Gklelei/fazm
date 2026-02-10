"use client";

import { useForm } from "react-hook-form";
import { ExpenseCategorySchema, ExpenseCategoryType } from "../Validators";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useRouter } from "next/navigation";

const CreateExpenseCategory = () => {
  const [isPending, startTransistion] = useTransition();
  const router = useRouter();
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
        form.reset();
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
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create New Category
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Define a new category to organize your expenses effectively.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name Field */}
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    Category Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Office Supplies, Travel Expenses"
                      autoComplete="off"
                      className="h-10"
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
                <FormItem className="space-y-2 w-full">
                  <FormLabel className="text-sm font-medium">Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger className="h-10">
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

            {/* Description Field */}
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Briefly describe what this category covers..."
                      className="resize-none text-sm min-h-24"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => form.reset()}
              >
                Clear
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2Icon className="animate-spin mr-2 h-4 w-4" />
                    Creating...
                  </>
                ) : (
                  "Create Category"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateExpenseCategory;
