/**
 * Where to go after signing in. Only same-site paths are allowed, so a
 * crafted link (?next=//evil.example or ?next=https://...) can't send
 * someone off-site after they enter their password.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\") || /[\r\n\t]/.test(value)) return "/";
  return value;
}
