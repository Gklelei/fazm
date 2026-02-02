"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useState } from "react";
import z from "zod";

const EmailSchema = z.object({
  mailList: z.array(
    z
      .string()
      .trim()
      .min(1, { error: "Add atleast one recepinet to the mailing list" }),
  ),

  message: z.string().trim().min(1, { error: "Message is required" }),
  subject: z.string().trim().min(1, "Subject is required"),
});

type mailPaylodType = z.infer<typeof EmailSchema>;

const SendEmail = () => {
  const [query, setQuery] = useState<string>("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send email</CardTitle>
        <CardDescription>Send email to choosen recepients</CardDescription>
      </CardHeader>
      <CardContent>
        <>
          <Tabs defaultValue="athlete"></Tabs>
          <Card>
            <CardHeader>
              <div>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="select a group to send emails to" />
                  </SelectTrigger>
                  <SelectContent>
                    {["doctors", "finance", "coaches", "admin", "athletes"].map(
                      (i, idx) => (
                        <SelectItem key={idx} value={i.toUpperCase()}>
                          {i.toWellFormed()}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search users to send emails"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </CardHeader>
          </Card>
        </>
      </CardContent>
    </Card>
  );
};

export default SendEmail;
