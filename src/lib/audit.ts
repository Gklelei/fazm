import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./prisma";

type Changes = { before: Record<string, unknown>; after: Record<string, unknown> };

/**
 * Writes one activity log entry. Who did it (their role at the time), from
 * which address and device are filled in here, so callers only say what
 * happened. Never throws: a failed log write must not undo the user's change.
 */
export async function createAuditLog({
  action,
  resource,
  details,
  userId,
  recordId,
  changes,
  academyId,
  athleteId,
  invoiceId,
  trainingId,
  assessmentId,
  batchId,
  drillId,
  request: given,
}: {
  action: string;
  resource: string;
  details?: string;
  userId?: string;
  /** The record's id when it has no column of its own (staff, guardian, plan, payment...) */
  recordId?: string;
  /** From diffFields(); omitted when nothing changed */
  changes?: Changes | null;
  academyId?: string;
  athleteId?: string;
  invoiceId?: string;
  trainingId?: string;
  assessmentId?: string;
  batchId?: string;
  drillId?: string;
  /** Request headers read earlier, for logging after the response (Next's after()) */
  request?: Pick<Headers, "get">;
}) {
  try {
    const [request, user] = await Promise.all([
      // Outside a request (a script) there are no headers; log without them
      given ??
        Promise.resolve()
          .then(() => headers())
          .catch(() => null),
      userId ? db.user.findUnique({ where: { id: userId }, select: { role: true } }) : null,
    ]);
    await db.auditLog.create({
      data: {
        action,
        resource,
        details,
        userId,
        role: user?.role ?? null,
        // nginx sets X-Real-IP; X-Forwarded-For can be forged by the client
        ip: request?.get("x-real-ip") ?? null,
        userAgent: request?.get("user-agent")?.slice(0, 300) ?? null,
        recordId,
        changes: (changes ?? undefined) as Prisma.InputJsonValue | undefined,
        academyId,
        athleteId,
        invoiceId,
        trainingId,
        assessmentId,
        batchId,
        drillId,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The fields of `after` whose value differs from `before`, as { before, after },
 * or null when nothing changed. Pass `hide` for fields whose values must not be
 * stored (they're recorded as changed, without the values).
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  hide: string[] = [],
): Changes | null {
  const changes: Changes = { before: {}, after: {} };
  for (const key of Object.keys(after)) {
    if (after[key] === undefined || same(before[key], after[key])) continue;
    const secret = hide.includes(key);
    changes.before[key] = secret ? "(hidden)" : (before[key] ?? null);
    changes.after[key] = secret ? "(hidden)" : after[key];
  }
  return Object.keys(changes.after).length ? changes : null;
}
