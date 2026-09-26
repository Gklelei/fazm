import CreateTrainingSession from "@/Modules/Trainings/ui/CreateTrainingSession";
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Training Session" };

const Page = () => {
  return <CreateTrainingSession />;
};

export default Page;
