import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { RegisterAthlete } from "@/features/athletes/components/register/RegisterAthlete";

export const metadata: Metadata = { title: "Register athlete" };

// Admin-only, like the registration action itself
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Register athlete" />
      <RegisterAthlete />
    </div>
  );
}
