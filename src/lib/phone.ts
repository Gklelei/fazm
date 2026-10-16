/**
 * Kenyan mobile numbers, stored the way the academy's data already holds them:
 * 10 digits starting 07 or 01 (0757777343). Accepts what people type:
 * 0757 777 343, 757777343, +254 757 777 343, 254757777343.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("254") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[17]\d{8}$/.test(local) ? `0${local}` : null;
}

/** 0757777343 → "0757 777 343"; anything else is shown as stored. */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return "";
  return /^0\d{9}$/.test(stored) ? `${stored.slice(0, 4)} ${stored.slice(4, 7)} ${stored.slice(7)}` : stored;
}
