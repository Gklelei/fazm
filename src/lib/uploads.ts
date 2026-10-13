import path from "node:path";

/** Where uploads live: UPLOAD_ROOT in production, public/uploads in dev. */
export const UPLOAD_ROOT =
  process.env.NODE_ENV === "production" && process.env.UPLOAD_ROOT
    ? process.env.UPLOAD_ROOT
    : path.join(process.cwd(), "public", "uploads");

export const SAFE_DIR = /^[A-Za-z0-9_-]{1,40}$/;
export const SAFE_FILE = /^[A-Za-z0-9._-]{1,200}$/;

/**
 * Accepted types, identified by the file's first bytes rather than the
 * browser-supplied MIME type or name, which can be anything. The stored
 * extension comes from here, so an uploaded .html can never be served as
 * a page.
 */
const SIGNATURES: { ext: string; mime: string; match: (b: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "gif", mime: "image/gif", match: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  { ext: "webp", mime: "image/webp", match: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { ext: "pdf", mime: "application/pdf", match: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
];

export function detectFileType(buf: Buffer) {
  return SIGNATURES.find((s) => s.match(buf)) ?? null;
}

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  SIGNATURES.map((s) => [s.ext, s.mime]).concat([["jpeg", "image/jpeg"]]),
);

/** Resolves /uploads/<dir>/<file> to a path inside UPLOAD_ROOT, or null. */
export function resolveUpload(dir: string, file: string): string | null {
  if (!SAFE_DIR.test(dir) || !SAFE_FILE.test(file) || file.startsWith(".")) return null;
  const root = path.resolve(UPLOAD_ROOT);
  const full = path.resolve(root, dir, file);
  return full.startsWith(root + path.sep) ? full : null;
}
