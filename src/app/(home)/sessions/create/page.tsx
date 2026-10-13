import CreateTrainingSession from "@/features/trainings/components/CreateTrainingSession";
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Training Session" };

const Page = () => {
  return <CreateTrainingSession />;
};

export default Page;
