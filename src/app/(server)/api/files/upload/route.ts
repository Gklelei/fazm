import * as fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import * as path from "path";

export const runtime = "nodejs";

const UPLOAD_ROOT =
  process.env.NODE_ENV === "production"
    ? process.env.UPLOAD_ROOT
    : path.join(process.cwd(), "public", "uploads");

const SAFE_DIR_REGEX = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILE_REGEX = /^[a-zA-Z0-9._-]+$/;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const directory = formData.get("dir");

    if (!(file instanceof File) || typeof directory !== "string") {
      return NextResponse.json(
        { error: "File and directory are required" },
        { status: 400 },
      );
    }

    if (!SAFE_DIR_REGEX.test(directory)) {
      return NextResponse.json(
        { error: "Invalid directory name" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const targetDir = path.join(UPLOAD_ROOT!, directory);
    const filePath = path.join(targetDir, safeFileName);

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const fileUrl =
      process.env.NODE_ENV === "production"
        ? `https://www.system.fazamfootball.org/uploads/${directory}/${safeFileName}`
        : `/uploads/${directory}/${safeFileName}`;

    return NextResponse.json(
      {
        message: "File uploaded",
        url: fileUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/* =========================
   DELETE FILE (SAFE)
========================= */
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (typeof url !== "string") {
      return NextResponse.json(
        { error: "File url is required" },
        { status: 400 },
      );
    }

    // Expect: /uploads/<DIR>/<FILENAME>
    if (!url.startsWith("/uploads/")) {
      return NextResponse.json({ error: "Invalid file url" }, { status: 400 });
    }

    const parts = url.split("/").filter(Boolean); // ["uploads", "DIR", "FILE"]

    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid file url format" },
        { status: 400 },
      );
    }

    const directory = parts[1];
    const fileName = parts[2];

    if (!SAFE_DIR_REGEX.test(directory)) {
      return NextResponse.json({ error: "Invalid directory" }, { status: 400 });
    }

    if (!SAFE_FILE_REGEX.test(fileName)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const filePath = path.join(UPLOAD_ROOT!, directory, fileName);

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(UPLOAD_ROOT!);

    if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Idempotent delete (no crash if already deleted)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fs.unlink(resolvedPath).catch((err: any) => {
      if (err?.code !== "ENOENT") throw err;
    });

    return NextResponse.json({ message: "File deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
