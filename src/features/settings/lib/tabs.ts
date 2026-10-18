// Plain module: the server page and the client nav both read it
export const SETTINGS_TABS = [
  { key: "batches", label: "Batches", group: "Club lists", list: true },
  { key: "pitches", label: "Pitches", group: "Club lists", list: true },
  { key: "drills", label: "Drills", group: "Club lists", list: true },
  { key: "reasons", label: "Attendance reasons", group: "Club lists", list: true },
  { key: "documents", label: "Invoices and receipts", group: "Preferences", list: false },
  { key: "fees", label: "Fees", group: "Preferences", list: false },
  { key: "attendance", label: "Attendance and sessions", group: "Preferences", list: false },
  { key: "registration", label: "Registration", group: "Preferences", list: false },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];
export type ListTab = Extract<(typeof SETTINGS_TABS)[number], { list: true }>["key"];
export const isListTab = (t: SettingsTab): t is ListTab => SETTINGS_TABS.some((x) => x.key === t && x.list);
