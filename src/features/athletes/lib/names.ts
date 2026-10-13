/** "First Middle Last", skipping missing parts. Safe on client and server. */
export const athleteName = (a: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) => [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
