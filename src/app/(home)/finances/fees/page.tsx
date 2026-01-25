import { db } from "@/lib/prisma";
import { GetAllSubsQuery } from "@/Modules/Finances/Type/Subs";
import ViewSubscriptions from "@/Modules/Finances/Ui/ViewSubscriptions";

const page = async () => {
  const allSubs = await db.subscriptionPlan.findMany(GetAllSubsQuery);
  return <ViewSubscriptions data={allSubs} />;
};

export default page;
