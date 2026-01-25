import { auth } from "@/lib/auth";
import SignUp from "@/Modules/Auth/SignUpForm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) redirect("/");
  return <SignUp />;
};

export default page;
