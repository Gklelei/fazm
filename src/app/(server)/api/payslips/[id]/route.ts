import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { canRunPayroll } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { payslipPdf } from "@/features/payroll/lib/payslip-pdf";
import type { Line } from "@/features/payroll/lib/calculate";

/** GET /api/payslips/:id: the payslip PDF, for the payroll person and the person it belongs to. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const slip = await db.payslip.findUnique({
    where: { id },
    include: {
      run: { select: { month: true, status: true } },
      staff: { select: { id: true, userId: true, fullNames: true, staffId: true, jobTitle: true, kraPin: true, nssfNumber: true, shifNumber: true, payMethod: true, payAccount: true } },
    },
  });
  if (!slip || (!canRunPayroll(session.user) && slip.staff.userId !== session.user.id)) return new Response("Not found", { status: 404 });

  // Owed after this month: approved advances less every recovery up to and including this payslip
  const advances = await db.salaryAdvance.findMany({
    where: { staffId: slip.staff.id, status: "APPROVED" },
    select: { amount: true, recoveries: { where: { payslip: { run: { month: { lte: slip.run.month } } } }, select: { amount: true } } },
  });
  const advanceLeft = advances.reduce((t, a) => t + Number(a.amount) - a.recoveries.reduce((x, r) => x + Number(r.amount), 0), 0);

  const url = new URL(req.url);
  const pdf = await payslipPdf(
    {
      month: slip.run.month,
      provisional: slip.status === "PROVISIONAL",
      staff: slip.staff,
      gross: Number(slip.gross),
      deductions: Number(slip.deductions),
      net: Number(slip.net),
      lines: slip.lines as Line[],
      advanceLeft: Math.max(0, advanceLeft),
    },
    `${url.protocol}//${url.host}`,
  );
  await createAuditLog({
    action: "EXPORT_PDF",
    resource: "Payroll",
    recordId: slip.staff.staffId,
    userId: session.user.id,
    details: `Downloaded ${slip.staff.fullNames}'s ${slip.run.month} payslip`,
  });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="payslip-${slip.staff.staffId}-${slip.run.month}.pdf"`, "Cache-Control": "no-store" },
  });
}
