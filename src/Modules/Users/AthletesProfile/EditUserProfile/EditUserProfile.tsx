"use client";
import { FullAthleteData } from "@/app/(home)/users/players/edit/[id]/page";
import { useForm } from "react-hook-form";
import {
  AthleteOnBoardingSchema,
  AthleteOnBoardingType,
} from "../../AthletesOnboarding/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeftCircle } from "lucide-react";
import PersonalInformation from "../../AthletesOnboarding/client/Components/PersonalInformation";
import { Separator } from "@/components/ui/separator";
import AthletesGuardian from "../../AthletesOnboarding/client/Components/AthletesGuardian";
import AthleteAddress from "../../AthletesOnboarding/client/Components/AthleteAddress";
import AthletesMedical from "../../AthletesOnboarding/client/Components/AthletesMedical";
import { Form } from "@/components/ui/form";
import AthleteDoccumnets from "../../AthletesOnboarding/client/Components/AthleteDoccumnets";
import AthletePhysicals from "../../AthletesOnboarding/client/Components/AthletePhysicals";
import { useTransition } from "react";
import { UpdateAthleteAction } from "./Server/UpdateAthleteAction";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { Loader2Spinner } from "@/utils/Alerts/Loader2Spinner";

interface Props {
  athlete: FullAthleteData;
}

const EditUserProfile = ({ athlete }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<AthleteOnBoardingType>({
    resolver: zodResolver(AthleteOnBoardingSchema),
    defaultValues: {
      addressLine1: athlete.address?.addressLine1 || "",
      addressLine2: athlete.address?.addressLine2 || "",
      allergies: athlete.medical?.allergies?.join(", ") || "",
      batch: athlete.batchesId || "",
      bloodGroup: athlete.medical?.bloogGroup || "",
      country: athlete.address?.country || "",
      estate: athlete.address?.estate || "",
      dateOfBirth: athlete.dateOfBirth || "",
      email: athlete.email || "",
      emergencyContactName: athlete.emergencyContacts[0]?.name || "",
      emergencyContactPhone: athlete.emergencyContacts[0]?.phoneNumber || "",
      emergencyContactRelationship:
        athlete.emergencyContacts[0]?.relationship || "",
      firstName: athlete.firstName || "",
      lastName: athlete.lastName || "",
      middleName: athlete.middleName || "",
      guardianEmail: athlete.guardians[0]?.email || "",
      guardianFullNames: athlete.guardians[0]?.fullNames || "",
      guardianPhoneNumber: athlete.guardians[0]?.phoneNumber || "",
      guardianRelationShip: athlete.guardians[0]?.relationship || "",
      medicalConditions: athlete.medical?.medicalConditions?.join(", ") || "",
      phoneNumber: athlete.phoneNumber || "",
      playingPositions: athlete.positions.join(", ") || "",
      profilePIcture: athlete.profilePIcture || "",
      town: athlete.address?.town || "",
      height: athlete.height || "",
      weight: athlete.weight,
      dominantFoot: athlete.foot,
      dominantHand: athlete.hand,
      birthCertificate: athlete.birthCertificate || "",
      passportCover: athlete.passportCover || "",
      passportPage: athlete.passportBioData || "",
      idBack: athlete.nationalIdBack || "",
      idFront: athlete.nationalIdFront || "",
      // subscriptionPlanId:athlete.
    },
  });
  const onSubmit = async (values: AthleteOnBoardingType) => {
    startTransition(async () => {
      const result = await UpdateAthleteAction(athlete.athleteId, values);

      if (result.status === "SUCCESS") {
        Sweetalert({
          icon: "success",
          text: result.successMessage ?? "Athlete created succecifully",
          title: "Success!",
        });
      } else if (result.status === "ERROR") {
        Sweetalert({
          icon: "error",
          text: result.errorMessage ?? "Failed to update athlete",
          title: "An error has occurred",
        });
      }
    });
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-6">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="icon"
                type="button"
                className="h-10 w-10 rounded-full"
              >
                <ArrowLeftCircle className="h-10 w-10" />
                Back
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Edit Athlete Profile
                </CardTitle>
                <CardDescription>
                  Update information for {athlete.firstName} {athlete.lastName}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <PersonalInformation />
            <Separator />
            <AthletesGuardian />
            <Separator />
            <AthleteAddress />
            <Separator />
            <AthleteDoccumnets />
            <Separator />
            <AthletePhysicals />
            <Separator />
            <AthletesMedical />

            <div className="flex justify-end pt-4">
              <Button
                disabled={isPending}
                type="submit"
                size="lg"
                className="w-full sm:w-auto"
              >
                {isPending ? <Loader2Spinner /> : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};

export default EditUserProfile;
