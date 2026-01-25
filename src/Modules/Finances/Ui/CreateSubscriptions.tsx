"use client";

import { useForm } from "react-hook-form";
import {
  SubscriptionsSchema,
  SubscriptionsSchemaType,
} from "../Validators/Subs";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2Icon, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransition } from "react";
import { CreateSubscriptionFees } from "../Server/CreateSubscriptionFees";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

const CreateSubscriptions = () => {
  const [isPending, startTransistion] = useTransition();
  const form = useForm<SubscriptionsSchemaType>({
    resolver: zodResolver(SubscriptionsSchema),
    defaultValues: {
      amount: 1,
      description: "",
      interval: "MONTHLY",
      name: "",
      status: "INACTIVE",
    },
  });

  const handleSubmit = async (data: SubscriptionsSchemaType) => {
    startTransistion(async () => {
      const result = await CreateSubscriptionFees(data);

      if (result.message) {
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
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Fee
        </Button>
      </SheetTrigger>
      <SheetContent className="p-6">
        <div className="flex flex-col ">
          <SheetHeader className="mb-8 text-center">
            <SheetTitle className="text-xl font-semibold">
              Create New Fee
            </SheetTitle>
          </SheetHeader>

          {/* Main Content - Centered Column */}
          <div className="flex-1">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex flex-col space-y-6 max-w-full mx-auto w-full px-4"
              >
                {/* Fee Name */}
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Fee Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Membership Fee"
                          type="text"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Fee Amount */}
                <FormField
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Amount
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value as string}
                            placeholder="0.00"
                            type="text"
                            className="w-full pl-6"
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Fee Description */}
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Describe what this fee is for..."
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Interval and Status */}
                <div className="space-y-6">
                  {/* Fee Interval */}
                  <FormField
                    name="interval"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          Billing Interval
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                            <SelectContent>
                              {["YEARLY", "MONTHLY", "WEEKLY", "DAILY"].map(
                                (i, idx) => (
                                  <SelectItem key={idx} value={i}>
                                    {i.charAt(0) + i.slice(1).toLowerCase()}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Fee Status */}
                  <FormField
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          Status
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {["ACTIVE", "INACTIVE"].map((i, idx) => (
                                <SelectItem key={idx} value={i}>
                                  {i.charAt(0) + i.slice(1).toLowerCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex flex-col gap-3 pt-6">
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                      <Loader2Icon className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      "Save Fee"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => form.reset()}
                  >
                    Reset Form
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateSubscriptions;
