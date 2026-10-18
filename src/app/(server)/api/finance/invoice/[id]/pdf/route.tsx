import { invoicePdf } from "@/features/invoices/lib/pdf";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { hasRole } from "@/lib/roles";

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
  const made = await invoicePdf({ id }, `${protocol}//${host}`);
  if (!made) {
    return new Response("Invoice not found", { status: 404 });
  }
  const { invoice, pdf } = made;

  await createAuditLog({
    action: "EXPORT",
    resource: "Invoice",
    details: `Downloaded invoice ${invoice.invoiceNumber} as PDF`,
    userId: session.user.id,
    invoiceId: invoice.id,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-cache",
    },
  });
}
