"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import PersonalInfo from "./PersonalInfo";
import GuardianInfo from "./GuardianInfo";
import AddressInfo from "./AddressInfo";
import MedicalEmergencyInformation from "./MedicalEmergencyInformation";
import EmergencyContacts from "./EmergencyContacts";
import FinancialRecords from "./FinancialRecords";
import AthleteInvoices from "./AthleteInvoices";
import AthleteAssesments from "./AthleteAssesments";
import AthleteSubscriptionPlans from "./AthleteSubscriptionPlans";

import { GetAthleteByIdQueryType } from "../Types";
import { GetCouponsQueryType } from "@/app/(home)/users/players/user-profile/[id]/page";
import ResponsiveSections, { Section } from "@/utils/ResponsiveSections";

export default function AthleteProfile({
  data,
  coupons,
}: {
  data: GetAthleteByIdQueryType;
  coupons: GetCouponsQueryType[];
}) {
  const router = useRouter();
  if (!data) return <div className="p-10 text-center">Athlete not found.</div>;

  const sections: Section[] = [
    {
      key: "guardian",
      label: "Guardians",
      description: "Parents/guardians contacts and relationships.",
      content: <GuardianInfo data={data} />,
    },
    {
      key: "address",
      label: "Address",
      description: "Residential details and location.",
      content: <AddressInfo data={data} />,
    },
    {
      key: "medical",
      label: "Medical",
      description: "Conditions, allergies and blood group.",
      content: <MedicalEmergencyInformation data={data} />,
    },
    {
      key: "emergency",
      label: "Emergency",
      description: "Emergency contacts for urgent situations.",
      content: <EmergencyContacts data={data} />,
    },
    {
      key: "fees",
      label: "Financials",
      description: "Payments history and receipts.",
      content: <FinancialRecords data={data} />,
    },
    {
      key: "invoice",
      label: "Invoices",
      description: "Billing records, due amounts and status.",
      content: <AthleteInvoices data={data} />,
    },
    {
      key: "assesments",
      label: "Assessments",
      description: "Coach assessments and performance notes.",
      content: <AthleteAssesments data={data} />,
    },
    {
      key: "plan",
      label: "Plan",
      description: "Subscription plan and coupon management.",
      content: <AthleteSubscriptionPlans data={data} coupons={coupons} />,
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg sm:text-xl font-bold">
            Athlete profile
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Profile, guardians, medical, invoices and assessments.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PersonalInfo data={data} />
      <Separator />

      <ResponsiveSections sections={sections} defaultKey="guardian" />
    </div>
  );
}
