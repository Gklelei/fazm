import { CheckCircle2, Clock4, Ban } from "lucide-react";

export const statusOptions = [
  {
    value: "PENDING",
    label: "Pending",
    Icon: Clock4,
    color: "text-warning-foreground dark:text-warning bg-warning/10 border-warning/30",
  },
  {
    value: "ACTIVE",
    label: "Active",
    Icon: CheckCircle2,
    color: "text-success bg-success/10 border-success/30",
  },
  {
    value: "SUSPENDED",
    label: "Suspended",
    Icon: Ban,
    color: "text-destructive bg-destructive/10 border-destructive/30",
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
  middleName: string | null;
  lastName: string;
  age?: number | null;
  email?: string | null;
  phoneNumber?: string | null;
  createdAt: string | Date;
  profilePIcture?: string | null;
  positions: string[];
  status: string;
};

export function fullName(a: AthleteRow) {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

export const ageText = (age?: number | null) => {
  if (!age) return "—";
  return age === 1 ? "1 year" : `${age} years`;
};
