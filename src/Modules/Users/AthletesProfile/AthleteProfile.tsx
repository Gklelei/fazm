"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import PersonalInfo from "./PersonalInfo";
import GuardianInfo from "./GuardianInfo";
import AddressInfo from "./AddressInfo";
import MedicalEmergencyInformation from "./MedicalEmergencyInformation";
import EmergencyContacts from "./EmergencyContacts";
import FinancialRecords from "./FinancialRecords";
import AthleteInvoices from "./AthleteInvoices";
import AthleteAssesments from "./AthleteAssesments";

import { GetAthleteByIdQueryType } from "../Types";
import AthleteSubscriptionPlans from "./AthleteSubscriptionPlans";
import { GetCouponsQueryType } from "@/app/(home)/users/players/user-profile/[id]/page";

const AthleteProfile = ({
  data,
  coupons,
}: {
  data: GetAthleteByIdQueryType;
  coupons: GetCouponsQueryType[];
}) => {
  const router = useRouter();

  if (!data) return <div className="p-10 text-center">Athlete not found.</div>;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <PersonalInfo data={data} />
      <Separator />

      <Tabs defaultValue="guardian" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-full md:w-auto justify-start mb-4">
            <TabsTrigger value="guardian">Guardian</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="fees">Financials</TabsTrigger>
            <TabsTrigger value="invoice">Invoices</TabsTrigger>
            <TabsTrigger value="assesments">Assessments</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
          </TabsList>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <TabsContent value="guardian">
              <GuardianInfo data={data} />
            </TabsContent>
            <TabsContent value="address">
              <AddressInfo data={data} />
            </TabsContent>
            <TabsContent value="medical">
              <MedicalEmergencyInformation data={data} />
            </TabsContent>
            <TabsContent value="emergency">
              <EmergencyContacts data={data} />
            </TabsContent>
            <TabsContent value="fees">
              <FinancialRecords data={data} />
            </TabsContent>
            <TabsContent value="invoice">
              <AthleteInvoices data={data} />
            </TabsContent>
            <TabsContent value="assesments">
              <AthleteAssesments data={data} />
            </TabsContent>
            <TabsContent value="plan">
              <AthleteSubscriptionPlans data={data} coupons={coupons} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default AthleteProfile;
