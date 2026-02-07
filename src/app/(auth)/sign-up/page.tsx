// // import NotFound from "@/app/not-found";
// import { auth } from "@/lib/auth";
// import SignUp from "@/Modules/Auth/SignUpForm";
// import { headers } from "next/headers";
// import { redirect } from "next/navigation";

import SignUp from "@/Modules/Auth/SignUpForm";

const page = async () => {
  // if (process.env.NODE_ENV === "production") return <NotFound />;
  // const session = await auth.api.getSession({
  //   headers: await headers(),
  // });

  // if (session) redirect("/");
  return <SignUp />;
};

export default page;
