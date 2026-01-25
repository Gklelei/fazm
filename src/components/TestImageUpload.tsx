"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { CloudinaryUpload } from "./ImageUploader";
import { Button } from "./ui/button";

const required = z.string().trim().min(1, "Required");
const schema = z.object({
  name: required,
  image: required,
});

type imageProps = z.infer<typeof schema>;

const TestImageUpload = () => {
  const form = useForm<imageProps>({
    resolver: zodResolver(schema),
    defaultValues: {
      image: "",
      name: "",
    },
  });

  const onsubmit = (data: imageProps) => {
    console.log(data);
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onsubmit)}>
        <FormField
          name="image"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>image</FormLabel>
              <FormControl>
                <CloudinaryUpload
                  onChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>name</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">submit</Button>
      </form>
    </Form>
  );
};

export default TestImageUpload;
