/**
 * Password rule for every account: either at least 12 characters, or at
 * least 8 characters mixing upper case, lower case, a number and a symbol.
 * Shared by the server (better-auth hooks) and the forms, so they agree.
 */
export const PASSWORD_CHECKS = [
  { id: "upper", label: "An upper-case letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lower-case letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "A symbol, e.g. ! @ # ?", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export const PASSWORD_RULE_TEXT =
  "Use at least 12 characters, or at least 8 with an upper-case letter, a lower-case letter, a number and a symbol.";

const MAX_LENGTH = 128;

export function isLongPassword(p: string) {
  return p.length >= 12;
}

export function isMixedPassword(p: string) {
  return p.length >= 8 && PASSWORD_CHECKS.every((c) => c.test(p));
}

/** null when the password is acceptable, otherwise what to fix. */
export function passwordProblem(p: string): string | null {
  if (p.length > MAX_LENGTH) return `Use at most ${MAX_LENGTH} characters.`;
  if (/^\s|\s$/.test(p)) return "Remove spaces at the start or end.";
  if (isLongPassword(p) || isMixedPassword(p)) return null;
  return PASSWORD_RULE_TEXT;
}
