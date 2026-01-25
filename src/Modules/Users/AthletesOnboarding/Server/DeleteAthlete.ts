"use server";

import { deleteCloudinaryImage } from "@/components/DeleteImage";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";

type ActionResult = {
  status: "SUCCESS" | "ERROR";
  successMessage?: string;
  errorMessage?: string;
};

const getPublicId = (url: string): string => {
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL: missing '/upload/'");
    }

    let pathAfterUpload = url.substring(uploadIndex + 8);
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, "");
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");

    return publicId;
  } catch (err) {
    console.error("Error parsing public ID:", err);
    throw new Error("Failed to parse image URL");
  }
};

export async function DeleteAthlete(id: string): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      status: "ERROR",
      errorMessage: "You must be logged in to perform this action.",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      status: "ERROR",
      errorMessage:
        "Access denied. This action requires administrator permissions.",
    };
  }

  try {
    if (!id) {
      return { status: "ERROR", errorMessage: "No Athlete ID provided" };
    }
    const existingAthlete = await db.athlete.findUnique({
      where: { athleteId: id },
    });

    if (!existingAthlete) {
      return { status: "ERROR", errorMessage: "Athlete does not exist" };
    }

    const filesToDelete = [
      existingAthlete.profilePIcture,
      existingAthlete.birthCertificate,
      existingAthlete.nationalIdFront,
      existingAthlete.nationalIdBack,
      existingAthlete.passportCover,
      existingAthlete.passportBioData,
    ];

    for (const url of filesToDelete) {
      if (url) {
        const publicId = getPublicId(url);
        if (publicId) await deleteCloudinaryImage(publicId);
      }
    }

    await db.athlete.update({
      where: { athleteId: id },
      data: {
        ArchiveDate: new Date(),
        isArchived: true,
      },
    });

    return {
      status: "SUCCESS",
      successMessage: "Athlete and associated documents removed successfully.",
    };
  } catch (error) {
    console.error("Critical Delete Error:", error);
    return {
      status: "ERROR",
      errorMessage:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
