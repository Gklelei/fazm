import { db } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import InvoiceDocument from "@/features/invoices/components/InvoiceDocument";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { getCachedAcademy } from "@/lib/academy-cache";
import { hasRole } from "@/lib/roles";
import { readFile } from "node:fs/promises";
import { MIME_BY_EXT, resolveUpload } from "@/lib/uploads";

/** Uploaded logos are private files; embed them for the server-side PDF renderer. */
async function embeddableLogo(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/")) return url ?? null;
  const [, , dir, file] = url.split("/");
  const target = resolveUpload(dir ?? "", file ?? "");
  const mime = MIME_BY_EXT[file?.split(".").pop()?.toLowerCase() ?? ""];
  if (!target || !mime) return null;
  try {
    return `data:${mime};base64,${(await readFile(target)).toString("base64")}`;
  } catch {
    return null;
  }
}

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
      subscriptionPlan: true,
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
