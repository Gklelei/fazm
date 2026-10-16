import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { checkRole } from "@/lib/authz";
import { hasRole } from "@/lib/roles";
import { MIME_BY_EXT, resolveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/** Athletes' identity and consent documents: only roles that can open athlete profiles. */
const ATHLETE_DOCUMENTS = new Set(["BIRTH_CERTIFICATES", "NATIONAL_IDENTIFICATIONS", "PASSPORTS", "CONSENT_FORMS"]);

/**
 * Uploaded photos and documents (birth certificates, IDs) are only for
 * signed-in staff. nginx forwards /uploads/ here instead of serving the
 * folder publicly.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ dir: string; file: string }> }) {
  const authz = await checkRole();
  if (!authz.ok || authz.session.user.mustChangePassword) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { dir, file } = await params;
  if (ATHLETE_DOCUMENTS.has(dir) && !hasRole(authz.session.user.role, "athletes")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const target = resolveUpload(dir, file);
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXT[ext];
  if (!target || !mime) return new NextResponse("Not found", { status: 404 });

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    const body = Readable.toWeb(createReadStream(target)) as ReadableStream;
    return new NextResponse(body, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
