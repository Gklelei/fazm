import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/prisma";
import { getCachedAcademy } from "@/lib/academy-cache";
import { embeddableLogo } from "@/lib/pdf-logo";
import InvoiceDocument from "@/features/invoices/components/InvoiceDocument";

/** One invoice as a PDF, for the download route and the invoice email. Null when it doesn't exist. */
export async function invoicePdf(where: { id: string } | { invoiceNumber: string }, baseUrl: string) {
  const invoice = await db.invoice.findUnique({
    where,
    include: {
      athlete: { select: { firstName: true, middleName: true, lastName: true, email: true, phoneNumber: true } },
      lines: { orderBy: { position: "asc" } },
      discounts: { orderBy: { createdAt: "asc" }, select: { id: true, label: true, amount: true } },
    },
  });
  if (!invoice) return null;
  const cached = await getCachedAcademy();
  // Uploaded images are private files; embed them for the renderer
  const academy = cached
    ? {
        ...cached,
        logoUrl: await embeddableLogo(cached.logoUrl),
        signatureUrl: await embeddableLogo(cached.signatureUrl),
        stampUrl: await embeddableLogo(cached.stampUrl),
      }
    : cached;
  const pdf = await renderToBuffer(<InvoiceDocument invoice={invoice} logoUrl={`${baseUrl}/Fazam Logo Half.jpg`} academy={academy} />);
  return { invoice, pdf };
}
