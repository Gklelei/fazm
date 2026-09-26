import AthletesOnboardingForm from "@/Modules/Users/AthletesOnboarding/client/Components/AthletesOnboardingForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Athlete" };

const page = () => {
  return <AthletesOnboardingForm />;
};

export default page;
