import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import SignUp from "@/Modules/Auth/SignUpForm";

const page = async () => {
  if (process.env.NODE_ENV === "production") return redirect("/");
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) redirect("/");
  return <SignUp />;
};

export default page;
