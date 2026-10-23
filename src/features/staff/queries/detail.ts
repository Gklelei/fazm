import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import type { StaffInput } from "../schemas";

export const STAFF_PAGE_INCLUDE = {
  user: { select: { id: true, email: true, role: true, isArchived: true, mustChangePassword: true, payrollAccess: true } },
  batches: { select: { id: true, name: true } },
  documents: { orderBy: { createdAt: "asc" } },
  _count: { select: { trainings: { where: { isArchived: false } }, attendances: true, assessments: true } },
} satisfies Prisma.staffInclude;

export type StaffRecord = Prisma.staffGetPayload<{ include: typeof STAFF_PAGE_INCLUDE }>;

export const findStaff = (staffId: string) => db.staff.findUnique({ where: { staffId }, include: STAFF_PAGE_INCLUDE });

/** The saved record as the form's values. Pay details only for the payroll person (`withPay`). */
export function staffFormValues(s: StaffRecord, withPay: boolean): StaffInput {
  const signsIn = !!s.user && !s.user.isArchived;
  return {
    fullNames: s.fullNames,
    phoneNumber: formatPhone(s.phoneNumber),
    email: s.email ?? s.user?.email ?? "",
    photo: s.photo ?? "",
    jobTitle: s.jobTitle ?? "",
    startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : "",
    nationalId: s.nationalId ?? "",
    kraPin: s.kraPin ?? "",
    nssfNumber: s.nssfNumber ?? "",
    shifNumber: s.shifNumber ?? "",
    salary: withPay && s.salary ? String(Number(s.salary)) : "",
    payBasis: withPay ? (s.payBasis ?? "") : "",
    sessionRate: withPay && s.sessionRate ? String(Number(s.sessionRate)) : "",
    payMethod: (withPay ? (s.payMethod ?? "") : "") as StaffInput["payMethod"],
    payAccount: withPay ? (s.payAccount ?? "") : "",
    emergencyName: s.emergencyName ?? "",
    emergencyPhone: formatPhone(s.emergencyPhone),
    emergencyRelationship: s.emergencyRelationship ?? "",
    batches: s.batches.map((b) => b.id),
    documents: s.documents.map((d) => ({ kind: d.kind as StaffInput["documents"][number]["kind"], name: d.name, url: d.url })),
    canSignIn: signsIn,
    payrollAccess: signsIn && !!s.user?.payrollAccess,
    role: s.user?.role ?? "COACH",
  };
}
