import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { saleByNumber } from "@/features/shop/queries";
import { saleReceiptPdf } from "@/features/shop/lib/receipt-pdf";

/** GET /api/shop/sales/:number/receipt: the sale's receipt as a PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!hasRole(session.user.role, "finance")) return new Response("Forbidden", { status: 403 });
  const sale = await saleByNumber((await params).number);
  if (!sale) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const pdf = await saleReceiptPdf(sale, `${url.protocol}//${url.host}`);
  await createAuditLog({ action: "EXPORT_PDF", resource: "Shop", recordId: sale.saleNumber, userId: session.user.id, details: `Downloaded the receipt for ${sale.saleNumber}` });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="receipt-${sale.saleNumber}.pdf"`, "Cache-Control": "no-store" },
  });
}
