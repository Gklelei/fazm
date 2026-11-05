// Plain module: query builders on the server and filters shared with the client both read it
import type { Prisma } from "@/generated/prisma/client";

/**
 * One `where` fragment per model, so every list, export and report narrows to a
 * programme the same way. An athlete's programme is their batch's; money and
 * attendance follow the athlete or the session. `null` adds nothing (all programmes).
 */
export const inProgramme = {
  batch: (id: string | null): Prisma.BatchesWhereInput => (id ? { programmeId: id } : {}),
  athlete: (id: string | null): Prisma.AthleteWhereInput => (id ? { batches: { programmeId: id } } : {}),
  invoice: (id: string | null): Prisma.InvoiceWhereInput => (id ? { athlete: { batches: { programmeId: id } } } : {}),
  payment: (id: string | null): Prisma.FinanceWhereInput => (id ? { athlete: { batches: { programmeId: id } } } : {}),
  session: (id: string | null): Prisma.trainingWhereInput => (id ? { batch: { programmeId: id } } : {}),
  attendance: (id: string | null): Prisma.attendanceWhereInput => (id ? { training: { batch: { programmeId: id } } } : {}),
  /** The programme's own expenses; shared ones (no programme) are reported apart */
  expense: (id: string | null): Prisma.ExpensesWhereInput => (id ? { programmeId: id } : {}),
  /** Plans for the programme plus plans for any programme */
  plan: (id: string | null): Prisma.SubscriptionPlanWhereInput =>
    id ? { OR: [{ programmeId: id }, { programmeId: null }] } : {},
};
