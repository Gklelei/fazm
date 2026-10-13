"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Banknote, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import ResponsiveSections, { type Section } from "@/components/shared/ResponsiveSections";
import { formatCurrency } from "@/lib/format";
import { RecordPaymentDialog } from "@/features/finance/components/RecordPaymentDialog";
import type { AthleteCouponOption } from "@/features/coupons/queries";
import type { GetAthleteByIdQueryType } from "../../queries";
import type { AthleteSummary } from "../../queries/summary";
import { athleteName } from "../../lib/names";
import { ATHLETE_STATUS_LABEL } from "../AthleteRowActions";
import GuardianInfo from "./GuardianInfo";
import AddressInfo from "./AddressInfo";
import MedicalEmergencyInformation from "./MedicalEmergencyInformation";
import EmergencyContacts from "./EmergencyContacts";
import FinancialRecords from "./FinancialRecords";
import AthleteStatement from "./AthleteStatement";
import AthleteInvoices from "./AthleteInvoices";
import AthleteAssesments from "./AthleteAssessments";
import AthleteSubscriptionPlans from "./AthleteSubscriptionPlans";
import AthleteDocuments from "./AthleteDocuments";
import AthleteExportButton from "./AthleteExportButton";

const dash = (v?: string | number | null) => (v === null || v === undefined || v === "" ? "—" : v);

function Details({ data }: { data: GetAthleteByIdQueryType }) {
  const rows: [string, React.ReactNode][] = [
    ["Date of birth", data.dateOfBirth ? format(new Date(data.dateOfBirth), "d MMM yyyy") : "—"],
    ["Age", dash(data.age)],
    ["Batch", data.batches?.name ?? "—"],
    ["Positions", data.positions?.length ? data.positions.join(", ") : "—"],
    ["Phone", dash(data.phoneNumber)],
    ["Email", dash(data.email)],
    ["Height", dash(data.height)],
    ["Weight", dash(data.weight)],
    ["Strong foot", dash(data.foot)],
    ["Strong hand", dash(data.hand)],
    ["Registered", format(new Date(data.createdAt), "d MMM yyyy")],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-4 p-1 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{k}</dt>
          <dd className="mt-0.5 font-medium capitalize">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AthleteProfile({
  data,
  coupons,
  summary,
}: {
  data: GetAthleteByIdQueryType;
  coupons: AthleteCouponOption[];
  summary: AthleteSummary;
}) {
  const name = athleteName(data);
  const guardian = data.guardians[0];

  const sections: Section[] = [
    { key: "details", label: "Details", description: "Personal and physical details.", content: <Details data={data} /> },
    { key: "guardian", label: "Guardians", description: "Parents and guardians to contact.", content: <GuardianInfo data={data} /> },
    { key: "statement", label: "Statement", description: "Charges, payments and running balance.", content: <AthleteStatement data={data} /> },
    { key: "invoice", label: "Invoices", description: "What has been billed and what is still due.", content: <AthleteInvoices data={data} /> },
    { key: "fees", label: "Payments", description: "Payments received, with receipts.", content: <FinancialRecords data={data} /> },
    { key: "plan", label: "Fee plan", description: "The plan they're billed on, and coupons.", content: <AthleteSubscriptionPlans data={data} coupons={coupons} /> },
    { key: "assessments", label: "Assessments", description: "Coach assessments and notes.", content: <AthleteAssesments data={data} /> },
    { key: "medical", label: "Medical", description: "Blood group, allergies and conditions.", content: <MedicalEmergencyInformation data={data} /> },
    { key: "emergency", label: "Emergency", description: "Who to call in an emergency.", content: <EmergencyContacts data={data} /> },
    { key: "address", label: "Address", description: "Where they live.", content: <AddressInfo data={data} /> },
    { key: "documents", label: "Documents", description: "Birth certificate, ID and passport.", content: <AthleteDocuments data={data} /> },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/players">
          <ArrowLeft /> Athletes
        </Link>
      </Button>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar name={name} url={data.profilePIcture ?? ""} size={72} className="ring-2 ring-border" />
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-display text-3xl leading-none font-bold tracking-tight uppercase md:text-4xl">
              {name}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{data.athleteId}</span>
              {data.batches && <span className="font-medium text-foreground">{data.batches.name}</span>}
              {data.age != null && <span>{data.age} years</span>}
              <StatusBadge status={data.status}>{ATHLETE_STATUS_LABEL[data.status]}</StatusBadge>
            </p>
            {guardian && (
              <p className="text-sm">
                <span className="text-muted-foreground">Guardian </span>
                {guardian.fullNames}
                {guardian.phoneNumber && (
                  <a href={`tel:${guardian.phoneNumber}`} className="ml-2 inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground">
                    <Phone className="size-3" /> {guardian.phoneNumber}
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AthleteExportButton data={data} />
          <Button variant="outline" asChild>
            <Link href={`/players/edit/${data.athleteId}`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <RecordPaymentDialog
            athlete={{ athleteId: data.athleteId, name }}
            trigger={
              <Button>
                <Banknote /> Record payment
              </Button>
            }
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Attendance"
          value={summary.attendanceRate === null ? "—" : `${summary.attendanceRate}%`}
          note={
            summary.sessionsMarked
              ? `${summary.attended} of ${summary.sessionsMarked} sessions`
              : "No sessions marked yet"
          }
          tone={summary.attendanceRate !== null && summary.attendanceRate < 60 ? "warning" : "default"}
        />
        <StatCard label="Owes" value={formatCurrency(summary.owed)} tone={summary.owed > 0 ? "danger" : "default"} />
        <StatCard label="Paid to date" value={formatCurrency(summary.paid)} tone="success" />
        <StatCard label="Assessments" value={data.assessments.length} />
      </div>

      <ResponsiveSections sections={sections} defaultKey="details" />
    </div>
  );
}
