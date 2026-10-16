import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionForm } from "@/features/trainings/components/SessionForm";

export const metadata: Metadata = { title: "Plan a session" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Plan a session" />
      <SessionForm />
    </div>
  );
}
