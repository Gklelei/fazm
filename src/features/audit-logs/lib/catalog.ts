// Plain module: the server query and the client toolbar both read it.

/** What the log's view switch shows. */
export const KINDS = [
  { key: "changes", label: "Changes" },
  { key: "access", label: "Views & downloads" },
  { key: "security", label: "Sign-ins & security" },
  { key: "all", label: "Everything" },
] as const;
export type Kind = (typeof KINDS)[number]["key"];

export const ACCESS_ACTIONS = ["VIEW", "EXPORT", "EXPORT_PDF"];
export const SECURITY_ACTIONS = ["LOGIN", "LOGOUT", "LOGIN_FAILED", "PASSWORD_CHANGE", "PASSWORD_RESET", "ROLE_CHANGE"];

/** Areas of the app, by the `resource` names the code writes. */
export const AREAS = [
  { key: "athletes", label: "Athletes", resources: ["Athlete", "Guardian", "Subscription"] },
  {
    key: "money",
    label: "Money",
    resources: ["Invoice", "Finance", "Payment", "SubscriptionPlan", "Coupon", "Expense", "ExpenseCategory"],
  },
  {
    key: "training",
    label: "Training",
    resources: ["Batch", "TrainingSession", "Training", "Assessment", "AssessmentSection", "Drill", "TrainingLocation", "AttendanceReason"],
  },
  { key: "people", label: "People & access", resources: ["Staff", "User", "Session"] },
  { key: "system", label: "Academy & files", resources: ["Academy", "File", "Export", "Cron"] },
] as const;
export type Area = (typeof AREAS)[number]["key"];

export const areaOf = (resource: string) => AREAS.find((a) => (a.resources as readonly string[]).includes(resource));

/** How an entry reads at a glance: one of a few tones, from its action. */
export type Tone = "added" | "changed" | "removed" | "restored" | "viewed" | "downloaded" | "signin" | "signout" | "failed" | "security";

export function toneOf(action: string): Tone {
  if (action === "VIEW") return "viewed";
  if (action.startsWith("EXPORT")) return "downloaded";
  if (action === "LOGIN") return "signin";
  if (action === "LOGOUT") return "signout";
  if (action === "LOGIN_FAILED") return "failed";
  if (SECURITY_ACTIONS.includes(action)) return "security";
  if (/^(ARCHIVE|DELETE|VOID)/.test(action)) return "removed";
  if (action.startsWith("RESTORE")) return "restored";
  if (/^(CREATE|ADD|UPLOAD|PLAN)/.test(action)) return "added";
  return "changed";
}
