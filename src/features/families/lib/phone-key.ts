import { normalizePhone } from "@/lib/phone";

/** A guardian phone that can suggest siblings: a real-looking Kenyan mobile, not a placeholder like 0123456789. */
export function siblingPhoneKey(phone: string | null | undefined) {
  const p = phone ? normalizePhone(phone) : null;
  if (!p) return null;
  // Placeholders: counting digits, or the same digit eight times (0700000000)
  if (/^0(123456789|987654321)$/.test(p) || /(\d)\1{7}/.test(p)) return null;
  return p;
}
