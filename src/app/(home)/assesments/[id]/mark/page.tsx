import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { formatAcademy } from "@/lib/academy-time";
import { athleteName } from "@/features/athletes/lib/names";
import { PHOTO_SELECT, photoOf } from "@/features/athletes/lib/photo";
import { mayManageSession, NOT_YOUR_SESSION } from "@/features/trainings/lib/ownership";
import { AssessSession } from "@/features/assessments/components/AssessSession";

export const metadata: Metadata = { title: "Assess" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, training, sections, existing] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    db.training.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        date: true,
        isArchived: true,
        staffId: true,
        coach: { select: { fullNames: true } },
        athletes: {
          where: { isArchived: false },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: { athleteId: true, firstName: true, middleName: true, lastName: true, ...PHOTO_SELECT },
        },
      },
    }),
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
    db.assessment.findMany({
      where: { trainingId: id },
      select: { athleteId: true, comment: true, responses: { select: { metricId: true, grade: true, value: true } }, notes: { select: { sectionId: true, note: true } } },
    }),
  ]);
  if (!training || training.isArchived) notFound();
  if (session && !(await mayManageSession(session.user, training.staffId))) {
    return <p className="rounded-lg border bg-card px-4 py-14 text-center text-sm text-muted-foreground">{NOT_YOUR_SESSION}</p>;
  }

  const saved = Object.fromEntries(
    existing.map((a) => [
      a.athleteId,
      {
        grades: Object.fromEntries(a.responses.filter((r) => r.grade).map((r) => [r.metricId, r.grade!])),
        values: Object.fromEntries(a.responses.filter((r) => r.value != null).map((r) => [r.metricId, String(Number(r.value))])),
        notes: Object.fromEntries(a.notes.map((n) => [n.sectionId, n.note])),
        comment: a.comment ?? "",
      },
    ]),
  );

  return (
    <AssessSession
      training={{
        id: training.id,
        name: training.name,
        when: formatAcademy(training.date, { weekday: "short", day: "numeric", month: "short" }),
        coach: training.coach.fullNames,
      }}
      athletes={training.athletes.map((a) => ({ athleteId: a.athleteId, name: athleteName(a), photo: photoOf(a) }))}
      sections={sections}
      saved={saved}
    />
  );
}
