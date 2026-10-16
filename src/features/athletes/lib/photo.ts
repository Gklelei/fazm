/**
 * An athlete's photo is shown only with photos and videos consent (their
 * latest consent). Queries that need the photo select PHOTO_SELECT; screens
 * show photoOf(athlete).
 */
export const PHOTO_SELECT = {
  profilePIcture: true,
  consents: { orderBy: { createdAt: "desc" as const }, take: 1, select: { photos: true } },
} as const;

export const photoOf = (a: { profilePIcture?: string | null; consents?: { photos: boolean }[] }) =>
  a.consents?.[0]?.photos ? (a.profilePIcture ?? "") : "";
