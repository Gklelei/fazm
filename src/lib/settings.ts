import "server-only";
import { getCachedAcademy } from "@/lib/academy-cache";

/**
 * The academy's settings with today's behaviour as defaults, so the app works
 * the same before anyone opens Settings (and when there's no academy row yet).
 */
export const SETTING_DEFAULTS = {
  invoicePrefix: "INV",
  receiptPrefix: "FEES",
  invoiceDueDays: 7,
  defaultPlanId: null as string | null,
  lateFeeAmount: null as number | null,
  lateFeeGraceDays: 7,
  inactiveWeeks: 13,
  attendanceEditDays: null as number | null,
  sessionMinutes: 90,
  requiredDocuments: [] as string[],
  financeReportTo: [] as string[],
  emailInvoices: false,
  emailReceipts: false,
  emailOverdue: false,
  sessionTimeoutMinutes: null as number | null,
};

export type Settings = typeof SETTING_DEFAULTS;

export async function getSettings(): Promise<Settings> {
  const a = await getCachedAcademy().catch(() => null);
  if (!a) return SETTING_DEFAULTS;
  const picked = Object.fromEntries(Object.keys(SETTING_DEFAULTS).map((k) => [k, a[k as keyof typeof a] ?? SETTING_DEFAULTS[k as keyof Settings]]));
  return { ...(picked as Settings), lateFeeAmount: a.lateFeeAmount == null ? null : Number(a.lateFeeAmount) };
}

/** The academy row without the mail server login or report recipients, for anything that reaches a browser. */
export function withoutSecrets<T extends Record<string, unknown> | null>(academy: T) {
  if (!academy) return academy;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { smtpPassword, smtpUser, smtpHost, smtpPort, smtpSecure, financeReportTo, ...rest } = academy;
  return rest as Omit<NonNullable<T>, "smtpPassword" | "smtpUser" | "smtpHost" | "smtpPort" | "smtpSecure" | "financeReportTo">;
}
