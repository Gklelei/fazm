import { db } from "@/lib/prisma";
import { AllAthletesIDQuery } from "@/Modules/Finances/Invoices/Types";
import CreateInvoice from "@/Modules/Finances/Invoices/ui/CreateInvoice";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Invoice" };

const page = async () => {
  const AthleteIds = await db.athlete.findMany(AllAthletesIDQuery);
  return <CreateInvoice athletes={AthleteIds} />;
};

export default page;
