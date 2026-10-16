export const STAFF_ID_PREFIX = "STAFF-FFA";

/** The next staff number after the highest one in use: STAFF-FFA-1001, 1002… (old random ids count too). */
export function nextStaffId(existing: string[]) {
  const numbers = existing
    .filter((id) => id.startsWith(`${STAFF_ID_PREFIX}-`))
    .map((id) => Number(id.slice(STAFF_ID_PREFIX.length + 1)))
    .filter(Number.isInteger);
  return `${STAFF_ID_PREFIX}-${Math.max(1000, ...numbers) + 1}`;
}
