import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { StaffForm } from "@/features/staff/components/StaffForm";

export const metadata: Metadata = { title: "Add staff" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Add staff" />
      <StaffForm />
    </div>
  );
}
