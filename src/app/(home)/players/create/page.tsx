import AthletesOnboardingForm from "@/features/athletes/components/OnboardingForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Athlete" };

const page = () => {
  return <AthletesOnboardingForm />;
};

export default page;
