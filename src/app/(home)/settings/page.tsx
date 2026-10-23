import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { getCachedAcademy } from "@/lib/academy-cache";
import { getSettings } from "@/lib/settings";
import { getSettingsData } from "@/features/settings/queries";
import { BatchCard } from "@/features/settings/components/BatchCard";
import {
  AddItemButton,
  DrillList,
  PitchList,
  ReasonList,
} from "@/features/settings/components/SettingsLists";
import { PreferencesForm } from "@/features/settings/components/PreferencesForm";
import {
  ArchivedSwitch,
  SettingsNav,
} from "@/features/settings/components/SettingsToolbar";
import { DeductionsSettings } from "@/features/payroll/components/DeductionsSettings";
import { deductionSettings } from "@/features/payroll/queries";
import {
  SETTINGS_TABS,
  isListTab,
  type ListTab,
  type SettingsTab,
} from "@/features/settings/lib/tabs";

export const metadata: Metadata = { title: "Settings" };

const text = (n: number | null) => (n == null ? "" : String(n));

// Admin-only: the proxy limits /settings to the admin roles (nav-config).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; archived?: string }>;
}) {
  const sp = await searchParams;
  const tab = (SETTINGS_TABS.find((t) => t.key === sp.tab)?.key ??
    "batches") as SettingsTab;
  const showArchived = sp.archived === "1";
  const [data, s, academy, deductions] = await Promise.all([
    getSettingsData(),
    getSettings(),
    getCachedAcademy().catch(() => null),
    tab === "payroll" ? deductionSettings() : null,
  ]);

  const lists = {
    batches: data.batches,
    pitches: data.pitches,
    drills: data.drills,
    reasons: data.reasons,
  };
  const visible = <T extends { archived: boolean }>(rows: T[]) =>
    showArchived ? rows : rows.filter((r) => !r.archived);
  const counts = Object.fromEntries(
    Object.entries(lists).map(([k, rows]) => [
      k,
      rows.filter((r) => !r.archived).length,
    ]),
  ) as Record<ListTab, number>;

  const pitches = data.pitches
    .filter((p) => !p.archived)
    .map((p) => ({ id: p.id, name: p.name }));
  const coaches = data.coaches.map((c) => ({
    id: c.staffId,
    name: c.fullNames,
  }));
  const batches = visible(data.batches);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        actions={isListTab(tab) && <AddItemButton kind={tab} />}
      />
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav tab={tab} counts={counts} />

        <div className="min-w-0 space-y-4">
          {isListTab(tab) && (
            <ArchivedSwitch
              showArchived={showArchived}
              archivedCount={lists[tab].filter((r) => r.archived).length}
            />
          )}

          {tab === "batches" &&
            (batches.length ? (
              <div className="grid gap-4 2xl:grid-cols-2">
                {batches.map((b) => (
                  <BatchCard
                    key={b.id}
                    batch={b}
                    pitches={pitches}
                    coaches={coaches}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                No batches yet.
              </p>
            ))}
          {tab === "pitches" && <PitchList rows={visible(data.pitches)} />}
          {tab === "drills" && <DrillList rows={visible(data.drills)} />}
          {tab === "reasons" && <ReasonList rows={visible(data.reasons)} />}

          {deductions && (
            <DeductionsSettings
              rows={deductions.rows}
              staff={deductions.staff}
            />
          )}
          {!isListTab(tab) && tab !== "payroll" && !academy && (
            <p className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
              Set up the{" "}
              <a
                href="/academy"
                className="font-medium text-primary hover:underline"
              >
                academy profile
              </a>{" "}
              first.
            </p>
          )}
          {academy && tab === "documents" && (
            <PreferencesForm
              section="documents"
              values={{
                invoicePrefix: s.invoicePrefix,
                receiptPrefix: s.receiptPrefix,
                invoiceDueDays: String(s.invoiceDueDays),
                kraPin: academy.kraPin ?? "",
                documentTerms: academy.documentTerms ?? "",
              }}
            />
          )}
          {academy && tab === "fees" && (
            <PreferencesForm
              section="fees"
              values={{
                defaultPlanId: s.defaultPlanId ?? "",
                lateFeeAmount: text(s.lateFeeAmount),
                lateFeeGraceDays: String(s.lateFeeGraceDays),
                siblingDiscountType: s.siblingDiscountType ?? "PERCENTAGE",
                siblingDiscountValue: text(s.siblingDiscountValue),
              }}
              plans={data.plans}
            />
          )}
          {academy && tab === "attendance" && (
            <PreferencesForm
              section="attendance"
              values={{
                sessionMinutes: String(s.sessionMinutes),
                attendanceEditDays: text(s.attendanceEditDays),
                inactiveWeeks: String(s.inactiveWeeks),
              }}
            />
          )}
          {academy && tab === "registration" && (
            <PreferencesForm
              section="registration"
              values={{ requiredDocuments: s.requiredDocuments }}
            />
          )}
          {academy && tab === "shop" && (
            <PreferencesForm
              section="shop"
              values={{ lowStockLevel: String(s.lowStockLevel) }}
            />
          )}
          {academy && tab === "security" && (
            <PreferencesForm
              section="security"
              values={{ sessionTimeoutMinutes: text(s.sessionTimeoutMinutes) }}
            />
          )}
          {academy && tab === "emails" && (
            <PreferencesForm
              section="emails"
              passwordSaved={!!academy.smtpPassword}
              values={{
                senderName: academy.senderName ?? "",
                senderEmail: academy.senderEmail ?? "",
                replyTo: academy.replyTo ?? "",
                smtpHost: academy.smtpHost ?? "",
                smtpPort: text(academy.smtpPort),
                smtpUser: academy.smtpUser ?? "",
                smtpPassword: "",
                smtpSecure: academy.smtpSecure,
                financeReportTo: s.financeReportTo.map((name) => ({ name })),
                emailInvoices: s.emailInvoices,
                emailReceipts: s.emailReceipts,
                emailOverdue: s.emailOverdue,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
