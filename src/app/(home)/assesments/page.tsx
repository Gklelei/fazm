import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { hasRole } from "@/lib/roles";
import { Checklist } from "@/features/assessments/components/Checklist";

export const metadata: Metadata = { title: "Assessments" };

export default async function Page() {
  const [session, sections] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    db.assessmentTemplateSection.findMany({
      where: { isArchived: false },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        metrics: { where: { isArchived: false }, orderBy: [{ position: "asc" }, { label: "asc" }], select: { id: true, label: true, kind: true, unit: true, higherIsBetter: true } },
      },
    }),
  ]);
  return <Checklist sections={sections} canEdit={hasRole(session?.user.role, "admin")} />;
}
