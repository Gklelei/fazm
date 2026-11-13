// Plain module: links are built in server and client components alike

/**
 * Athlete IDs hold slashes (ATH/FFA/M/501), which can't sit in one URL path
 * segment, so links carry them with dashes (ATH-FFA-M-501). Programme codes
 * are letters only, so the dashes turn back into slashes unambiguously; see
 * athlete-ref.ts for the way back.
 */
export const athleteSlug = (athleteId: string) => athleteId.replaceAll("/", "-");

export const athletePath = (athleteId: string) => `/players/user-profile/${athleteSlug(athleteId)}`;
export const athleteEditPath = (athleteId: string) => `/players/edit/${athleteSlug(athleteId)}`;

/** The athlete's PDFs (statement, family statement, progress report) */
export const athletePdfPath = (athleteId: string, pdf: "statement" | "family-statement" | "assessment-report") =>
  `/api/athlete/${athleteSlug(athleteId)}/${pdf}`;

/** A download file name: no slashes */
export const athleteFileName = (prefix: string, athleteId: string) => `${prefix}-${athleteSlug(athleteId)}.pdf`;
