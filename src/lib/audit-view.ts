import "server-only";
import { after } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const REPEAT_MS = 10 * 60_000;

/**
 * Logs that the signed-in user opened a sensitive record (athlete with
 * medical details, invoice, payment, staff). Written after the page is sent,
 * so viewing never waits on it. Opening the same record again within 10
 * minutes isn't logged twice, so refreshes don't flood the log.
 */
export async function logView(entry: {
  resource: string;
  recordId: string;
  details: string;
  athleteId?: string;
  invoiceId?: string;
}) {
  // Pages can't read the request inside after(), so read it now
  const request = await headers();
  const session = await auth.api.getSession({ headers: request });
  if (!session?.user) return;
  const userId = session.user.id;
  const ip = request.get("x-real-ip");
  const userAgent = request.get("user-agent");

  after(async () => {
    try {
      const recent = await db.auditLog.findFirst({
        where: {
          userId,
          action: "VIEW",
          resource: entry.resource,
          recordId: entry.recordId,
          createdAt: { gte: new Date(Date.now() - REPEAT_MS) },
        },
        select: { id: true },
      });
      if (recent) return;
      await createAuditLog({
        action: "VIEW",
        userId,
        request: { get: (name: string) => (name === "x-real-ip" ? ip : name === "user-agent" ? userAgent : null) },
        ...entry,
      });
    } catch (error) {
      console.error("Failed to log a view:", error);
    }
  });
}
