import "server-only";
import nodemailer from "nodemailer";
import { getCachedAcademy } from "@/lib/academy-cache";
import { open } from "@/lib/secret-box";
import { SendMail as sendWithMailtrap } from "@/lib/mailtrap";

export type Mail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
};

type MailServer = { host: string; port: number; secure: boolean; user: string | null; password: string | null; from: string; replyTo: string | null };

/** The academy's own mail server from Settings → Emails, or null when it isn't set up. */
export async function mailServer(): Promise<MailServer | null> {
  const a = await getCachedAcademy().catch(() => null);
  if (!a?.smtpHost || !a.senderEmail) return null;
  return {
    host: a.smtpHost,
    port: a.smtpPort ?? (a.smtpSecure ? 465 : 587),
    secure: a.smtpSecure,
    user: a.smtpUser,
    password: open(a.smtpPassword),
    from: `"${(a.senderName || a.academyName).replaceAll('"', "")}" <${a.senderEmail}>`,
    replyTo: a.replyTo,
  };
}

export async function sendThrough(server: MailServer, mail: Mail) {
  const transport = nodemailer.createTransport({
    host: server.host,
    port: server.port,
    secure: server.secure,
    auth: server.user ? { user: server.user, pass: server.password ?? "" } : undefined,
    connectionTimeout: 15_000,
  });
  await transport.sendMail({ from: server.from, replyTo: server.replyTo ?? undefined, ...mail, to: mail.to.join(", ") });
}

/**
 * Sends one email through the academy's mail server when it's set up,
 * otherwise through Mailtrap as before. Never throws.
 */
export async function sendMail(mail: Mail): Promise<ActionResult> {
  const to = [...new Set(mail.to.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!to.length) return { success: false, message: "No one to send it to" };
  const server = await mailServer();
  if (!server) return sendWithMailtrap({ ...mail, to });
  try {
    await sendThrough(server, { ...mail, to });
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Mail server send failed", error);
    return { success: false, message: "Failed to send email" };
  }
}
