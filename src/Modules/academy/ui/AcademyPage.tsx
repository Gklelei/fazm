"use client";

import { useForm } from "react-hook-form";
import z from "zod";
import { AcademySchema } from "../Validation";
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
import { Button } from "@/components/ui/button";
import { getAcademyQueryType } from "../Validation/Types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Props {
  isEditting: boolean;
  academy: getAcademyQueryType | null;
}

const AcademyPage = ({ isEditting, academy }: Props) => {
  const form = useForm<z.infer<typeof AcademySchema>>({
    resolver: zodResolver(AcademySchema),
    defaultValues: {
      academyName: academy?.academyName || "",
      address: academy?.address || "",
      description: academy?.description || "",
      email: academy?.contactEmail || "",
      logo: undefined,
      paymentType: academy?.paymentMethodType || "",
      paymentMethod: academy?.paymentMathod || "",
      phone: academy?.contactPhone || "",
      tagline: academy?.tagline || "",
    },
  });

  // no functionality (but keep the form submit hook so it doesn't error)
  function handleSubmit(data: z.infer<typeof AcademySchema>) {
    if (isEditting) {
      console.log("Edited data:", data);
    } else {
      console.log("new Data:", data);
    }
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
              {isEditting ? "Editing" : "New setup"}
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
                          <Input {...field} placeholder="e.g. Fazam Academy" />
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
                          <Input {...field} placeholder="e.g. +2547..." />
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />

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
                    name="logo"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Logo
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              field.onChange(e.target.files?.[0])
                            }
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademyPage;
