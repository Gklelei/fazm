"use client";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalInfo from "./PersonalInfo";
import { TabsContent } from "@radix-ui/react-tabs";
import GuardianInfo from "./GuardianInfo";
import AddressInfo from "./AddressInfo";
import MedicalEmergencyInformation from "./MedicalEmergencyInformation";
import EmergencyContacts from "./EmergencyContacts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import FinancialRecords from "./FinancialRecords";
import { GetAthleteByIdQueryType } from "../Types";

const AthleteProfile = ({ data }: { data: GetAthleteByIdQueryType }) => {
  const router = useRouter();
  return (
    <div className="flex flex-col">
      <Button type="button" variant={"secondary"} onClick={() => router.back()}>
        Back
      </Button>
      <PersonalInfo data={data} />
      <Separator />
      <div className="mt-3">
        <Tabs defaultValue={"guardian"}>
          <TabsList>
            <TabsTrigger value="guardian">Guardian Information</TabsTrigger>
            <TabsTrigger value="address">Address Information</TabsTrigger>
            <TabsTrigger value="medical">
              Medical & Emergency Information
            </TabsTrigger>
            <TabsTrigger value="emergency">Emergency Contacts</TabsTrigger>
            <TabsTrigger value="fees">Financial records</TabsTrigger>
          </TabsList>
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
            <FinancialRecords data={data.finances ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AthleteProfile;
