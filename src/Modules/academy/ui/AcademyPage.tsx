"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AcademySchema } from "../Validation";
import { getAcademyQueryType } from "../Validation/Types";
import { CreateAcademyUtils, EditAcademyUtils } from "../Server/Academy";

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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LocalFsUpload } from "@/components/FsUploader/LocalFsImageUploader";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

interface Props {
  isEditting: boolean; // kept for compatibility, but not trusted
  academy: getAcademyQueryType | null;
}

type FormValues = z.infer<typeof AcademySchema>;

const AcademyPage = ({ academy }: Props) => {
  const router = useRouter();
  const editing = !!academy?.id;

  const initialValues: FormValues = useMemo(
    () => ({
      academyName: academy?.academyName || "",
      address: academy?.address || "",
      description: academy?.description || "",
      email: academy?.contactEmail || "",
      logoUrl: academy?.logoUrl || "",
      paymentType: academy?.paymentMethodType || "",
      paymentMethod: academy?.paymentMathod || "",
      phone: academy?.contactPhone || "",
      tagline: academy?.tagline || "",
      footerNotes: academy?.receiptFooterNotes || "",
    }),
    [academy],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(AcademySchema),
    defaultValues: initialValues,
    mode: "onSubmit",
  });

  const { isSubmitting, isDirty } = form.formState;

  const toast = (ok: boolean, message: string) => {
    Sweetalert({
      icon: ok ? "success" : "error",
      title: ok ? "Success!" : "An error has occurred",
      text: message,
    });
  };

  const normalize = (v: FormValues): FormValues => ({
    ...v,
    academyName: v.academyName.trim(),
    address: v.address.trim(),
    email: v.email.trim(),
    phone: v.phone.trim(),
    tagline: v.tagline.trim(),
    paymentType: v.paymentType.trim(),
    paymentMethod: v.paymentMethod.trim(),
    description: v.description?.trim() || "",
    logoUrl: v.logoUrl?.trim() || "",
    footerNotes: v.footerNotes?.trim() || "",
  });

  async function handleSubmit(values: FormValues) {
    const payload = normalize(values);

    if (editing) {
      if (!academy?.id) {
        toast(false, "Missing academy id. Refresh the page and try again.");
        return;
      }

      const result = await EditAcademyUtils({ id: academy.id, data: payload });
      toast(result.success, result.message);
      if (result.success) form.reset(payload);
      return;
    }

    const result = await CreateAcademyUtils({ data: payload });
    toast(result.success, result.message);
    if (result.success) form.reset(payload);
  }

  return (
    <div className="max-w-full mx-auto px-4 py-8">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">
                Academy settings
              </CardTitle>
              <CardDescription className="text-sm">
                Configure your global academy settings.
              </CardDescription>
            </div>

            <div className="text-xs font-medium px-2 py-1 rounded-md border">
              {editing ? "Editing" : "New setup"}
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-10"
            >
              {/* Basic Info */}
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Basic information</h3>
                  <p className="text-sm text-muted-foreground">
                    These details show up across the system.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="academyName"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Academy name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Fazam Academy"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="tagline"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Tagline
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Building champions"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="address"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Along Mombasa Road"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Phone
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. +2547..."
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Contact email
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. info@academy.com"
                          type="email"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="footerNotes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Receipt footer notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-28 resize-none"
                          placeholder="Receipt footer notes..."
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-28 resize-none"
                          placeholder="Short description about your academy..."
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />
              {/* Payments */}
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Payments</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure billing defaults.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="paymentType"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Payment type
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. MPESA / BANK / CASH"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="paymentMethod"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Payment method details
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Paybill/Till/Account no."
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>
              {/* Branding */}
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Branding</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your logo for documents and dashboards.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    name="logoUrl"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Logo
                        </FormLabel>
                        <FormControl className="w-full">
                          <LocalFsUpload
                            onChange={(url: string) => field.onChange(url)}
                            value={field.value || ""}
                            folder="PROFILE"
                            maxSizeMB={2}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          PNG/JPG recommended.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset(initialValues)}
                  disabled={isSubmitting || !isDirty}
                  className="w-full sm:w-auto"
                >
                  Reset changes
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademyPage;
