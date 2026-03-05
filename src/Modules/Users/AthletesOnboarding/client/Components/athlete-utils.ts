import { CheckCircle2, Clock4, Ban } from "lucide-react";

export const statusOptions = [
  {
    value: "PENDING",
    label: "Pending",
    Icon: Clock4,
    color: "text-amber-600 bg-amber-100 border-amber-200",
  },
  {
    value: "ACTIVE",
    label: "Active",
    Icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-100 border-emerald-200",
  },
  {
    value: "SUSPENDED",
    label: "Suspended",
    Icon: Ban,
    color: "text-red-600 bg-red-100 border-red-200",
  },
] as const;

export function normalizeStatus(raw?: string) {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "DEACTIVATED" || s === "SUSPEND") return "SUSPENDED";
  return s || "PENDING";
}

export type AthleteRow = {
  id: string;
  athleteId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  age?: number;
  email?: string | null;
  profilePIcture?: string | null;
  positions: string[];
  status: string;
};

export function fullName(a: AthleteRow) {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

export const ageText = (age?: number) => {
  if (!age) return "—";
  return age === 1 ? "1 year" : `${age} years`;
};
