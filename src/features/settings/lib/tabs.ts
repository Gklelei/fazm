// Plain module: the server page and the client toolbar both read it
export const SETTINGS_TABS = [
  { key: "squads", label: "Squads" },
  { key: "pitches", label: "Pitches" },
  { key: "drills", label: "Drills" },
  { key: "reasons", label: "Attendance reasons" },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];
