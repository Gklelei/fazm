import { db } from "@/lib/prisma";
import { AllAthletesIDQuery } from "@/features/invoices/queries";
import CreateInvoice from "@/features/invoices/components/CreateInvoice";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Invoice" };

const page = async () => {
  const AthleteIds = await db.athlete.findMany(AllAthletesIDQuery);
  return <CreateInvoice athletes={AthleteIds} />;
};

export default page;
