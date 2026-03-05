import { db } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import InvoiceDocument from "@/Modules/Finances/Invoices/ui/InvoiceDocument";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { protocol, host } = new URL(req.url);
  const baseUrl = `${protocol}//${host}`;
  const logoUrl = `${baseUrl}/Fazam Logo Half.jpg`;

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      athlete: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      subscriptionPlan: true,
    },
  });
  const academy = await db.academy.findFirst();
  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const stream = await renderToStream(
    <InvoiceDocument invoice={invoice} logoUrl={logoUrl} academy={academy} />,
  );

  await createAuditLog({
    action: "EXPORT_PDF",
    resource: "Invoice",
    details: JSON.stringify({
      invoiceId: id,
      athlete: invoice.athlete
        ? `${invoice.athlete.firstName} ${invoice.athlete.lastName}`
        : "Unknown",
      amountPaid: Number(invoice.amountPaid),
      amountDue: Number(invoice.amountDue),
    }),
    userId: session?.user.id,
  });

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
      "Cache-Control": "no-cache",
    },
  });
}
