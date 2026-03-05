import { db } from "./prisma";

export async function createAuditLog({
  action,
  resource,
  details,
  userId,
  academyId,
  athleteId,
  invoiceId,
  trainingId,
  assessmentId,
  batchId,
  drillId,
}: {
  action: string;
  resource: string;
  details?: string;
  userId?: string;
  academyId?: string;
  athleteId?: string;
  invoiceId?: string;
  trainingId?: string;
  assessmentId?: string;
  batchId?: string;
  drillId?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        action,
        resource,
        details,
        userId,
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
