"use server";

import { db } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { TRAINING_STATUS } from "@/generated/prisma/enums";

const DayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const BatchSubmissionSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  trainingLocationsId: z.string().min(1, "Location is required"),
  staffId: z.string().min(1, "Coach is required"),
  sessions: z
    .array(
      z.object({
        days: z.array(DayOfWeekEnum).min(1),
        startTime: z.string().trim(),
        endTime: z.string().trim(),
      }),
    )
    .min(1),
  note: z.string().optional(),
});

export type BatchSubmission = z.infer<typeof BatchSubmissionSchema>;

export async function CreateBatchWithSchedule(data: BatchSubmission) {
  const parsed = BatchSubmissionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid data",
      errors: parsed.error.format(),
    };
  }

  const {
    name,
    description,
    startDate,
    endDate,
    sessions,
    trainingLocationsId,
    staffId,
    note,
  } = parsed.data;

  try {
    const scheduleItems = sessions.flatMap((s) =>
      s.days.map((day) => ({
        dayOfWeek: day,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    );

    const result = await db.$transaction(async (tx) => {
      const batch = await tx.batches.create({
        data: {
          name,
          description,
          startDate,
          endDate,
          schedules: {
            create: scheduleItems.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              time: s.startTime,
            })),
          },
        },
      });

      const trainingsToCreate = generateTrainingsForBatch(
        batch.id,
        startDate,
        endDate,
        scheduleItems,
        trainingLocationsId,
        staffId,
        name,
        note,
      );

      if (trainingsToCreate.length > 0) {
        await tx.training.createMany({ data: trainingsToCreate });
      }

      return { batchId: batch.id, count: trainingsToCreate.length };
    });

    revalidatePath("/batches");
    return {
      success: true,
      message: `Batch created with ${result.count} sessions`,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(error);
    return { success: false, message: "Database error: " + error.message };
  }
}

function generateTrainingsForBatch(
  batchId: string,
  start: Date,
  end: Date,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedules: any[],
  locId: string,
  staffId: string,
  batchName: string,
  note?: string,
) {
  const DOW_TO_UTC: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const trainings = [];
  const seen = new Set<string>();

  for (const sch of schedules) {
    const dates = generateWeeklyDates(start, end, DOW_TO_UTC[sch.dayOfWeek]);
    const { hh, mm } = parseTime(sch.startTime);
    const duration = getDuration(sch.startTime, sch.endTime);

    for (const d of dates) {
      const sessionDate = new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          hh,
          mm,
          0,
        ),
      );
      const key = sessionDate.toISOString();

      if (!seen.has(key)) {
        seen.add(key);
        trainings.push({
          batchesId: batchId,
          date: sessionDate,
          name: `${batchName} Training`,
          description: `Session: ${sch.dayOfWeek} at ${sch.startTime}`,
          duration,
          trainingLocationsId: locId,
          staffId: staffId,
          status: TRAINING_STATUS.SCHEDULED, // Fixed: Using Enum
          note: note || null,
          isArchived: false,
        });
      }
    }
  }
  return trainings;
}

const parseTime = (t: string) => ({
  hh: parseInt(t.split(":")[0]),
  mm: parseInt(t.split(":")[1]),
});
const getDuration = (s: string, e: string) => {
  const sm = parseTime(s).hh * 60 + parseTime(s).mm;
  const em = parseTime(e).hh * 60 + parseTime(e).mm;
  return em - sm;
};
const generateWeeklyDates = (start: Date, end: Date, dayOfWeek: number) => {
  const s = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const e = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  const dates = [];
  const current = new Date(s);
  current.setUTCDate(s.getUTCDate() + ((dayOfWeek - s.getUTCDay() + 7) % 7));
  while (current <= e) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return dates;
};
