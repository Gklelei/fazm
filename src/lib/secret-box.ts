import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts settings secrets (the mail server password) at rest with
 * AES-256-GCM. The key is SETTINGS_KEY, or derived from BETTER_AUTH_SECRET,
 * so a database copy alone can't reveal them.
 */
function key() {
  const secret = process.env.SETTINGS_KEY || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("SETTINGS_KEY or BETTER_AUTH_SECRET must be set to store secrets");
  return createHash("sha256").update(`fazam-settings:${secret}`).digest();
}

/** "v1:<iv>:<tag>:<data>", base64url. */
export function seal(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

/** The plain text, or null if it can't be opened (other key, tampered). */
export function open(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [v, iv, tag, data] = sealed.split(":");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
