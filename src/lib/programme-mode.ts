// Plain module: the server switch and the Settings control both read it
export const PROGRAMMES_MODES = [
  { value: "off", label: "No one", hint: "Programmes are hidden for everyone." },
  { value: "preview", label: "Only me", hint: "Only the super admin sees programmes, to try them on the live site." },
  { value: "on", label: "Everyone", hint: "Every user sees the programme switcher and fields." },
] as const;
export type ProgrammesMode = (typeof PROGRAMMES_MODES)[number]["value"];
export const isProgrammesMode = (v: unknown): v is ProgrammesMode => PROGRAMMES_MODES.some((m) => m.value === v);
