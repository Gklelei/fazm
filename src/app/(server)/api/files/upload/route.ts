import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { checkRole, AUTHZ_HTTP_STATUS } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { detectFileType, resolveUpload, SAFE_DIR, UPLOAD_ROOT } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Upload a photo or document. Stored under a random name; type checked by content. */
export async function POST(req: NextRequest) {
  const authz = await checkRole();
  if (!authz.ok) return NextResponse.json({ error: "Unauthorized" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const directory = formData.get("dir");

    if (!(file instanceof File) || typeof directory !== "string" || !SAFE_DIR.test(directory)) {
      return NextResponse.json({ error: "A file and a valid folder are required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File is too large (10 MB max)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectFileType(buffer);
    if (!type) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, GIF images or PDF files" }, { status: 400 });
    }

    // Unguessable name; extension from the detected type, never the upload's
    const name = `${randomUUID()}.${type.ext}`;
    const target = resolveUpload(directory, name);
    if (!target) return NextResponse.json({ error: "Invalid folder" }, { status: 400 });

    await fs.mkdir(path.join(UPLOAD_ROOT, directory), { recursive: true });
    await fs.writeFile(target, buffer, { mode: 0o640 });

    return NextResponse.json({ message: "File uploaded", url: `/uploads/${directory}/${name}` }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/** Delete an uploaded file. Admins only: documents are part of athlete records. */
export async function DELETE(req: NextRequest) {
  const authz = await checkRole([...ROLE_GROUPS.admin]);
  if (!authz.ok) return NextResponse.json({ error: "Not allowed" }, { status: AUTHZ_HTTP_STATUS[authz.reason] });

  try {
    const { url } = (await req.json()) as { url?: unknown };
    const parts = typeof url === "string" ? url.split("/").filter(Boolean) : [];
    const target = parts.length === 3 && parts[0] === "uploads" ? resolveUpload(parts[1], parts[2]) : null;
    if (!target) return NextResponse.json({ error: "Invalid file url" }, { status: 400 });

    await fs.unlink(target).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") throw err;
    });
    return NextResponse.json({ message: "File deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
