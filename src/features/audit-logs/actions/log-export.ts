"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const exportSchema = z.object({
  what: z.string().trim().min(1).max(120),
  format: z.enum(["CSV", "Excel", "PDF"]),
  rows: z.number().int().min(0).max(1_000_000).optional(),
  recordId: z.string().max(120).optional(),
});

/**
 * Records a download made in the browser (list exports, receipts, session
 * sheets, profiles). Called by the export code, never shown to the user.
 */
export async function logExport(input: z.input<typeof exportSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const parsed = exportSchema.safeParse(input);
  if (!session?.user || !parsed.success) return;
  const { what, format, rows, recordId } = parsed.data;
  await createAuditLog({
    action: "EXPORT",
    resource: "Export",
    details: `Downloaded ${what} as ${format}${rows !== undefined ? ` (${rows} row${rows === 1 ? "" : "s"})` : ""}`,
    userId: session.user.id,
    recordId,
  });
}
