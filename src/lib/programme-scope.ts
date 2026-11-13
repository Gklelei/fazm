// Plain module: query builders on the server and filters shared with the client both read it
import type { Prisma } from "@/generated/prisma/client";

/**
 * One `where` fragment per model, so every list, export and report narrows to a
 * programme the same way. An athlete's programme is their batch's; attendance
 * follows the session. Money follows the programme stamped on it when billed
 * (the database stamps every new invoice and payment), so a transferred
 * athlete's past money stays where it was. `null` adds nothing (all programmes).
 */
export const inProgramme = {
  batch: (id: string | null): Prisma.BatchesWhereInput => (id ? { programmeId: id } : {}),
  athlete: (id: string | null): Prisma.AthleteWhereInput => (id ? { batches: { programmeId: id } } : {}),
  invoice: (id: string | null): Prisma.InvoiceWhereInput => (id ? { programmeId: id } : {}),
  payment: (id: string | null): Prisma.FinanceWhereInput => (id ? { programmeId: id } : {}),
  session: (id: string | null): Prisma.trainingWhereInput => (id ? { batch: { programmeId: id } } : {}),
  attendance: (id: string | null): Prisma.attendanceWhereInput => (id ? { training: { batch: { programmeId: id } } } : {}),
  /** The programme's own expenses; shared ones (no programme) are reported apart */
  expense: (id: string | null): Prisma.ExpensesWhereInput => (id ? { programmeId: id } : {}),
  /** Plans for the programme plus plans for any programme */
  plan: (id: string | null): Prisma.SubscriptionPlanWhereInput =>
    id ? { OR: [{ programmeId: id }, { programmeId: null }] } : {},
};
