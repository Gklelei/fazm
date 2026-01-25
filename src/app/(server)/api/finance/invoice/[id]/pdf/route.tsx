import { db } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import InvoiceDocument from "@/Modules/Finances/Invoices/ui/InvoiceDocument";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    },
  });

  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const stream = await renderToStream(
    <InvoiceDocument invoice={invoice} logoUrl={logoUrl} />
  );

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
      "Cache-Control": "no-cache",
    },
  });
}
