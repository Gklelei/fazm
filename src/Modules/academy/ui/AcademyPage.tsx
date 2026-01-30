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
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { getAcademyQueryType } from "../Validation/Types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  async function handleSubmit(data: z.infer<typeof AcademySchema>) {
    if (isEditting) {
      console.log("Edited information:", data);
    } else {
      console.log("created information", data);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academy settings</CardTitle>
        <CardDescription>
          Configure your global academy settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <FormField
                name="academyName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academy name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="i.e fazam" type="text" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="address"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academy Addresss</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="i.e along mombasa road"
                        type="text"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academy Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="i.e fazam@gmail.com"
                        type="email"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academy Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="i.e i.e we are aleading footabl organization"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit">Save</Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
};

export default AcademyPage;
