"use server";

import { db } from "@/lib/prisma";
import { AthleteOnBoardingType } from "@/Modules/Users/AthletesOnboarding/validation";
import { revalidatePath } from "next/cache";

type ActionResult = {
  status: "SUCCESS" | "ERROR";
  successMessage?: string;
  errorMessage?: string;
};

export const UpdateAthleteAction = async (
  id: string,
  data: AthleteOnBoardingType
): Promise<ActionResult> => {
  const positions = data.playingPositions
    ? data.playingPositions
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  const allergies = data.allergies
    ? data.allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  const medicalConditions = data.medicalConditions
    ? data.medicalConditions
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : [];
  try {
    await db.athlete.update({
      where: { athleteId: id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        dateOfBirth: data.dateOfBirth,
        positions,
        batchesId: data.batch,
        profilePIcture: data.profilePIcture,
        birthCertificate: data.birthCertificate,
        foot: data.dominantFoot,
        hand: data.dominantHand,
        passportBioData: data.passportPage,
        passportCover: data.passportCover,
        nationalIdBack: data.idBack,
        nationalIdFront: data.idFront,
        address: {
          update: {
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            country: data.country,
            county: data.county,
            subCounty: data.subCounty,
          },
        },
        medical: {
          update: {
            bloogGroup: data.bloodGroup,
            allergies: allergies,
            medicalConditions: medicalConditions,
          },
        },
        guardians: {
          deleteMany: {},
          create: [
            {
              fullNames: data.guardianFullNames,
              relationship: data.guardianRelationShip,
              email: data.guardianEmail,
              phoneNumber: data.guardianPhoneNumber,
            },
          ],
        },
        emergencyContacts: {
          deleteMany: {},
          create: [
            {
              name: data.emergencyContactName,
              phoneNumber: data.emergencyContactPhone,
              relationship: data.emergencyContactRelationship,
            },
          ],
        },
      },
    });

    revalidatePath("/users/players");
    revalidatePath(`/users/players/edit/${id}`);

    return {
      status: "SUCCESS",
      successMessage: "Athlete profile updated successfully.",
    };
  } catch (error) {
    console.error("Update Error:", error);

    return {
      status: "ERROR",
      errorMessage:
        "An error occurred while updating the profile. Please try again.",
    };
  }
};
