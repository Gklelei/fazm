import "server-only";
import { readFile } from "node:fs/promises";
import { MIME_BY_EXT, resolveUpload } from "@/lib/uploads";

/** Uploaded logos are private files; embed them for the server-side PDF renderer. */
export async function embeddableLogo(url: string | null | undefined) {
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
