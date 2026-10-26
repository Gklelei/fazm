"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Banknote, Pencil, Phone, ShoppingBag } from "lucide-react";
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
import FamilyPanel from "@/features/families/components/FamilyPanel";
import type { Family } from "@/features/families/queries";
import AthleteInvoices from "./AthleteInvoices";
import AthleteAssessments from "./AthleteAssessments";
import type { AthleteProgress } from "@/features/assessments/queries/progress";
import AthleteSubscriptionPlans from "./AthleteSubscriptionPlans";
import AthleteDocuments from "./AthleteDocuments";
import AthleteExportButton from "./AthleteExportButton";
import { ConsentDialog, ConsentPanel, type ConsentRecord } from "./ConsentPanel";
import { photoOf } from "@/features/athletes/lib/photo";
import { CONSENT_ENABLED } from "@/features/athletes/lib/consent-switch";

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

/** What a finance officer sees on a profile */
const MONEY_SECTIONS = new Set(["guardian", "family", "statement", "invoice", "fees", "plan"]);

export default function AthleteProfile({
  data,
  coupons,
  summary,
  canManageConsent,
  canSendStatement,
  family,
  moneyOnly = false,
  progress,
}: {
  data: GetAthleteByIdQueryType;
  coupons: AthleteCouponOption[];
  summary: AthleteSummary;
  canManageConsent: boolean;
  canSendStatement: boolean;
  family: Family | null;
  /** Finance officers: only the money sections, no medical or personal details */
  moneyOnly?: boolean;
  progress: AthleteProgress;
}) {
  const name = athleteName(data);
  const guardian = data.guardians[0];
  const consents = data.consents as unknown as ConsentRecord[];
  // No photo without photos and videos consent (existing athletes too), while consent is on
  const photo = photoOf(data);
  const consentAthlete = {
    athleteId: data.athleteId,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    guardian: guardian ? { name: guardian.fullNames, relationship: guardian.relationship } : undefined,
  };

  const sections: Section[] = [
    { key: "details", label: "Details", description: "Personal and physical details.", content: <Details data={data} /> },
    { key: "guardian", label: "Guardians", description: "Parents and guardians to contact.", content: <GuardianInfo data={data} /> },
    ...(family
      ? [{ key: "family", label: "Family", description: "Brothers and sisters billed together.", content: <FamilyPanel athleteId={data.athleteId} family={family} canManage={canSendStatement} /> }]
      : []),
    { key: "statement", label: "Statement", description: "Charges, payments and running balance.", content: <AthleteStatement data={data} canSend={canSendStatement} /> },
    { key: "invoice", label: "Invoices", description: "What has been billed and what is still due.", content: <AthleteInvoices data={data} /> },
    { key: "fees", label: "Payments", description: "Payments received, with receipts.", content: <FinancialRecords data={data} /> },
    { key: "plan", label: "Fee plan", description: "The plan they're billed on, and coupons.", content: <AthleteSubscriptionPlans data={data} coupons={coupons} /> },
    { key: "assessments", label: "Assessments", description: "Progress on each skill, against the batch.", content: <AthleteAssessments athleteId={data.athleteId} progress={progress} /> },
    { key: "medical", label: "Medical", description: "Blood group, allergies and conditions.", content: <MedicalEmergencyInformation data={data} /> },
    { key: "emergency", label: "Emergency", description: "Who to call in an emergency.", content: <EmergencyContacts data={data} /> },
    { key: "address", label: "Address", description: "Where they live.", content: <AddressInfo data={data} /> },
    { key: "documents", label: "Documents", description: "Birth certificate, ID and passport.", content: <AthleteDocuments data={data} /> },
    ...(CONSENT_ENABLED ? [{ key: "consent", label: "Consent", content: <ConsentPanel athlete={consentAthlete} consents={consents} canManage={canManageConsent} /> }] : []),
  ];
  const shown = moneyOnly ? sections.filter((s) => MONEY_SECTIONS.has(s.key)) : sections;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/players">
          <ArrowLeft /> Athletes
        </Link>
      </Button>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar name={name} url={photo} size={72} className="ring-2 ring-border" />
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-display text-3xl leading-none font-bold tracking-tight uppercase md:text-4xl">
              {name}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{data.athleteId}</span>
              {data.batches && <span className="font-medium text-foreground">{data.batches.name}</span>}
              {data.age != null && <span>{data.age} years</span>}
              <StatusBadge status={data.status}>{ATHLETE_STATUS_LABEL[data.status]}</StatusBadge>
              {CONSENT_ENABLED && !consents.length && !moneyOnly && <StatusBadge tone="warning">Consent missing</StatusBadge>}
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
          {CONSENT_ENABLED && !consents.length && canManageConsent && (
            <ConsentDialog athlete={consentAthlete} trigger={<Button variant="outline">Record consent</Button>} />
          )}
          {!moneyOnly && (
            <>
              <AthleteExportButton data={data} />
              <Button variant="outline" asChild>
                <Link href={`/players/edit/${data.athleteId}`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            </>
          )}
          {canSendStatement && (
            <Button variant="outline" asChild>
              <Link href={`/shop/new?athlete=${data.athleteId}`}>
                <ShoppingBag /> Sell kit
              </Link>
            </Button>
          )}
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

      <ResponsiveSections sections={shown} defaultKey={moneyOnly ? "statement" : "details"} />
    </div>
  );
}
