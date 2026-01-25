import { db } from "@/lib/prisma";
import { GuardiansQuery } from "@/Modules/Guardions/types";
import ViewAllGuardins from "@/Modules/Guardions/Ui/ViewAllGuardins";

const page = async () => {
  const guardians = await db.athleteGuardian.findMany(GuardiansQuery);
  const guardinsCount = await db.athleteGuardian.count();
  return (
    <div>
      <ViewAllGuardins data={guardians} noOfGuarddians={guardinsCount} />
    </div>
  );
};

export default page;
