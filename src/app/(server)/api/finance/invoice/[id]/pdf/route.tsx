import { db } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import InvoiceDocument from "@/features/invoices/components/InvoiceDocument";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { getCachedAcademy } from "@/lib/academy-cache";
import { hasRole } from "@/lib/roles";
import { embeddableLogo } from "@/lib/pdf-logo";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasRole(session.user.role, "finance")) {
    return new Response("Forbidden", { status: 403 });
  }

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
      lines: { orderBy: { position: "asc" } },
    },
  });
  const cached = await getCachedAcademy();
  const academy = cached ? { ...cached, logoUrl: await embeddableLogo(cached.logoUrl) } : cached;
  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const stream = await renderToStream(
    <InvoiceDocument invoice={invoice} logoUrl={logoUrl} academy={academy} />,
  );

  await createAuditLog({
    action: "EXPORT",
    resource: "Invoice",
    details: `Downloaded invoice ${invoice.invoiceNumber} as PDF`,
    userId: session.user.id,
    invoiceId: invoice.id,
  });

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-cache",
    },
  });
}
