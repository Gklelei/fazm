import NotFound from "@/app/not-found";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { GetUserProfileQuery } from "@/Modules/Users/stafff/types";
import StaffProfilePage from "@/Modules/Users/stafff/Ui/StaffProfilePage";
import { headers } from "next/headers";

const page = async () => {
  const profile = await auth.api.getSession({
    headers: await headers(),
  });

  if (!profile) {
    return <NotFound />;
  }

  const User = await db.user.findUnique(GetUserProfileQuery(profile?.user.id));

  if (!User) return <NotFound />;
  return (
    <div>
      <StaffProfilePage data={User} />
    </div>
  );
};

export default page;
