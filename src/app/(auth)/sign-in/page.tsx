import { auth } from "@/lib/auth";
import SignInForm from "@/Modules/Auth/SignInForm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) redirect("/");
  return <SignInForm />;
};

export default page;
