import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeLocation, resetDb, signedIn } from "@/tests/support/db";
import { saveSection, setSectionArchived } from "@/features/assessments/actions/checklist";
import { saveAssessment } from "@/features/assessments/actions/create-assessment";
import { athleteProgress } from "@/features/assessments/queries/progress";
import type { AssessmentInput } from "@/features/assessments/schemas";

async function checklist() {
  await signedIn("ADMIN");
  await saveSection(null, {
    name: "Speed",
    description: "",
    metrics: [
      { label: "First touch", kind: "GRADE", unit: "", higherIsBetter: true },
      { label: "30 m sprint", kind: "MEASURE", unit: "s", higherIsBetter: false },
    ],
  });
  const metrics = await db.assessmentMetric.findMany({ orderBy: { position: "asc" } });
  return { section: metrics[0].sectionId, touch: metrics[0].id, sprint: metrics[1].id };
}

async function session(coachStaffId: string, batchesId: string, athleteIds: string[], daysAgo: number) {
  const location = await makeLocation();
  return db.training.create({
    data: {
      name: "U13 training",
      description: "",
      date: new Date(Date.now() - daysAgo * 86_400_000),
      duration: 90,
      batchesId,
      trainingLocationsId: location.id,
      staffId: coachStaffId,
      athletes: { connect: athleteIds.map((athleteId) => ({ athleteId })) },
    },
  });
}

const input = (trainingId: string, athleteId: string, over: Partial<AssessmentInput> = {}): AssessmentInput => ({
  trainingId,
  athleteId,
  grades: {},
  values: {},
  notes: {},
  comment: "",
  ...over,
});

describe("the assessment checklist", () => {
  beforeEach(resetDb);

  it("keeps skills in order, needs a unit for measurements, and archives skills taken out", async () => {
    const { section, touch, sprint } = await checklist();
    expect((await saveSection(section, { name: "Speed", description: "", metrics: [{ label: "Agility", kind: "MEASURE", unit: "", higherIsBetter: true }] })).message).toBe(
      "Add a unit, e.g. s or touches",
    );
    await saveSection(section, { name: "Speed", description: "", metrics: [{ id: sprint, label: "30 m sprint", kind: "MEASURE", unit: "s", higherIsBetter: false }] });
    const all = await db.assessmentMetric.findMany({ select: { id: true, isArchived: true, position: true } });
    expect(all.find((m) => m.id === touch)?.isArchived).toBe(true);
    expect(all.find((m) => m.id === sprint)).toMatchObject({ isArchived: false, position: 0 });
  });

  it("is managed by admins only", async () => {
    await signedIn("COACH");
    expect((await saveSection(null, { name: "X", description: "", metrics: [{ label: "Y", kind: "GRADE", unit: "", higherIsBetter: true }] })).success).toBe(false);
  });
});

describe("assessing athletes", () => {
  beforeEach(resetDb);

  it("saves grades, measurements and notes, and replaces them on edit", async () => {
    const { section, touch, sprint } = await checklist();
    const { staff } = await signedIn("COACH");
    const batch = await makeBatch();
    const a = await makeAthlete({ batchesId: batch.id });
    const t = await session(staff!.staffId, batch.id, [a.athleteId], 1);

    const res = await saveAssessment(input(t.id, a.athleteId, { grades: { [touch]: "GOOD" }, values: { [sprint]: "4.85" }, notes: { [section]: "Quick off the mark" }, comment: "Good week" }));
    expect(res.success).toBe(true);
    let saved = await db.assessment.findFirstOrThrow({ include: { responses: true, notes: true } });
    expect(saved.responses.map((r) => [r.grade, r.value && Number(r.value)]).sort()).toEqual([["GOOD", null], [null, 4.85]].sort());
    expect(saved.notes[0].note).toBe("Quick off the mark");

    await saveAssessment(input(t.id, a.athleteId, { grades: { [touch]: "EXCELLENT" } }));
    saved = await db.assessment.findFirstOrThrow({ include: { responses: true, notes: true } });
    expect([saved.responses.length, saved.responses[0].grade, saved.notes.length, saved.comment]).toEqual([1, "EXCELLENT", 0, null]);
  });

  it("refuses a grade for a measured skill, and athletes not on the register", async () => {
    const { sprint, touch } = await checklist();
    const { staff } = await signedIn("COACH");
    const batch = await makeBatch();
    const [a, other] = await Promise.all([makeAthlete({ batchesId: batch.id }), makeAthlete()]);
    const t = await session(staff!.staffId, batch.id, [a.athleteId], 1);
    expect((await saveAssessment(input(t.id, a.athleteId, { grades: { [sprint]: "GOOD" } }))).success).toBe(false);
    expect((await saveAssessment(input(t.id, other.athleteId, { grades: { [touch]: "GOOD" } }))).message).toBe("This athlete isn't on this session's register.");
  });

  it("shows progress, the best time (lower is better) and the batch average", async () => {
    const { touch, sprint } = await checklist();
    const { staff } = await signedIn("COACH");
    const batch = await makeBatch();
    const [a, b] = await Promise.all([makeAthlete({ batchesId: batch.id }), makeAthlete({ batchesId: batch.id })]);
    const first = await session(staff!.staffId, batch.id, [a.athleteId, b.athleteId], 20);
    const second = await session(staff!.staffId, batch.id, [a.athleteId], 5);
    await saveAssessment(input(first.id, a.athleteId, { grades: { [touch]: "NEEDS_WORK" }, values: { [sprint]: "5.2" } }));
    await saveAssessment(input(first.id, b.athleteId, { grades: { [touch]: "EXCELLENT" }, values: { [sprint]: "4.6" } }));
    await saveAssessment(input(second.id, a.athleteId, { grades: { [touch]: "GOOD" }, values: { [sprint]: "4.9" } }));

    const p = await athleteProgress(a.athleteId);
    const [g, m] = p.sections[0].metrics;
    expect([g.latest, g.change, g.best, g.batchAverage, g.batchCount]).toEqual([3, 1, 3, 4, 2]);
    // 0.3 s faster reads as +0.3 better
    expect([m.latest, m.change, m.best, m.batchAverage]).toEqual([4.9, 0.3, 4.9, 4.75]);
    expect(p.assessments.map((x) => x.id)).toHaveLength(2);
  });

  it("drops archived sections from progress", async () => {
    const { section, touch } = await checklist();
    const { staff } = await signedIn("COACH");
    const batch = await makeBatch();
    const a = await makeAthlete({ batchesId: batch.id });
    const t = await session(staff!.staffId, batch.id, [a.athleteId], 1);
    await saveAssessment(input(t.id, a.athleteId, { grades: { [touch]: "GOOD" } }));
    await signedIn("ADMIN");
    await setSectionArchived(section, true);
    expect((await athleteProgress(a.athleteId)).sections).toEqual([]);
  });
});
