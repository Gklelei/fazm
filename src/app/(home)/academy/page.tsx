import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { getCachedAcademy } from "@/lib/academy-cache";
import AcademyPage from "@/features/academy/components/AcademyPage";

export const metadata: Metadata = { title: "Academy profile" };

export default async function Page() {
  const academy = await getCachedAcademy();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Academy profile" />
      <AcademyPage academy={academy} />
    </div>
  );
}
