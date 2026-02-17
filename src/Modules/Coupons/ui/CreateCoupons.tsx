/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PlusIcon,
  Ticket,
  Percent,
  Hash,
  Calendar,
  Info,
  RefreshCcw,
  Loader2Icon,
  PenIcon,
} from "lucide-react";

import { couponSchema, couponSchemaType } from "../Validation";
import { CreateCouponsAction } from "../Server/CouponsAction";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { GetCouponsQueryType } from "../Types/Index";

interface Props {
  coupon?: GetCouponsQueryType;
  id?: string;
}

function toDateInputValue(d?: Date) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  // value is YYYY-MM-DD
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

const CreateCoupons = ({ id, coupon }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const isEditing = useMemo(() => Boolean(id || coupon?.id), [id, coupon?.id]);
  // const couponId = id ?? coupon?.id;

  const form = useForm<couponSchemaType>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      name: "",
      discountType: "",
      value: 0,
      interval: "",
      usageLimit: 0,
      startDate: new Date(),
      expiryDate: undefined,
    },
  });

  useEffect(() => {
    if (!coupon) return;

    form.reset({
      name: coupon.name ?? "",
      discountType: coupon.discountType ?? "",
      value: coupon.value ? Number(coupon.value) : 0,
      interval: coupon.interval ?? "",
      usageLimit: coupon.usageLimit ? Number(coupon.usageLimit) : 0,
      startDate: coupon.startDate ? new Date(coupon.startDate) : new Date(),
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate) : undefined,
    });
  }, [coupon, form]);

  const handleSubmit = async (data: couponSchemaType) => {
    startTransition(async () => {
      const result = await CreateCouponsAction(data);

      if (result.success) {
        toast.success(result.message);
        form.reset({
          name: "",
          discountType: "",
          value: 0,
          interval: "",
          usageLimit: 0,
          startDate: new Date(),
          expiryDate: undefined,
        });
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  const title = isEditing ? "Edit Discount Coupon" : "New Discount Coupon";
  const desc = isEditing
    ? "Update coupon configuration and validity."
    : "Configure promotional codes for athlete billing.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="outline" className="gap-2">
            <PenIcon className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button className="gap-2 shadow-md hover:shadow-lg transition-all active:scale-95">
            <PlusIcon className="h-4 w-4" />
            Add Coupon
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                <DialogDescription>{desc}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-6 space-y-8"
          >
            {/* --- SECTION 1: IDENTITY --- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Info className="h-4 w-4" /> General Information
              </div>

              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="e.g. SIBLING_20"
                          className="h-11 pl-10 font-mono font-bold uppercase"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                        <Hash className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/50" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      This is the code used to apply discount.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="opacity-50" />

            {/* --- SECTION 2: FINANCIALS & RULES --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Percent className="h-4 w-4" /> Value Configuration
                </div>

                <FormField
                  name="discountType"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">
                            Percentage (%)
                          </SelectItem>
                          <SelectItem value="FIXED_AMOUNT">
                            Fixed Amount (KES)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="value"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            className="h-11 pr-12"
                            value={
                              Number.isFinite(field.value) ? field.value : 0
                            }
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                          <div className="absolute right-3 top-3 text-sm font-bold text-muted-foreground">
                            {form.watch("discountType") === "PERCENTAGE"
                              ? "%"
                              : "KES"}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <RefreshCcw className="h-4 w-4" /> Application Rules
                </div>

                <FormField
                  name="interval"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Frequency</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ONCE">
                            Once (Single use)
                          </SelectItem>
                          <SelectItem value="REPEATING">
                            Repeating (Monthly)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="usageLimit"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redemption Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0 for unlimited"
                          className="h-11"
                          value={Number.isFinite(field.value) ? field.value : 0}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* --- SECTION 3: TIMING --- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Calendar className="h-4 w-4" /> Validity Period
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="startDate"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts On</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11"
                          value={toDateInputValue(field.value)}
                          onChange={(e) =>
                            field.onChange(
                              parseDateInput(e.target.value) ?? new Date(),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="expiryDate"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires On</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11"
                          value={toDateInputValue(field.value)}
                          onChange={(e) =>
                            field.onChange(parseDateInput(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t mt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-11 text-muted-foreground"
                onClick={() => {
                  if (coupon) {
                    // reset back to coupon values
                    form.reset({
                      name: coupon.name ?? "",
                      discountType: coupon.discountType ?? "",
                      value: coupon.value ? Number(coupon.value) : 0,
                      interval: coupon.interval ?? "",
                      usageLimit: coupon.usageLimit
                        ? Number(coupon.usageLimit)
                        : 0,
                      startDate: coupon.startDate
                        ? new Date(coupon.startDate)
                        : new Date(),
                      expiryDate: coupon.expiryDate
                        ? new Date(coupon.expiryDate)
                        : undefined,
                    });
                  } else {
                    form.reset();
                  }
                }}
                disabled={isPending}
              >
                Reset
              </Button>

              <Button
                type="submit"
                className="flex-2 h-11 font-bold"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2Icon className="animate-spin mx-auto size-4" />
                ) : (
                  "Save Coupon"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCoupons;
