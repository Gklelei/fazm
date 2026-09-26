import AthletesData from "@/Modules/Users/AthletesOnboarding/client/Components/AthletesData";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Athletes" };

const page = async () => {
  return <AthletesData />;
};

export default page;
