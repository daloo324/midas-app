import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Replies go here: the account exec (client emails) or the CEO (invoices). */
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
};

/**
 * Sends an email through Resend. When EMAIL_OUTBOX_DIR is set (local
 * development and tests), the email is written there as JSON instead.
 * Throws if sending fails, so callers can tell the person what happened.
 */
export async function sendEmail(email: Email): Promise<void> {
  const outbox = process.env.EMAIL_OUTBOX_DIR;
  if (outbox) {
    await mkdir(outbox, { recursive: true });
    const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    const { attachments, ...rest } = email;
    await writeFile(
      path.join(outbox, file),
      JSON.stringify(
        {
          ...rest,
          attachments: attachments?.map((a) => ({
            filename: a.filename,
            bytes: a.content.length,
            pdf: a.content.subarray(0, 5).toString() === "%PDF-",
          })),
          sentAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "Email isn't set up: RESEND_API_KEY and EMAIL_FROM are needed.",
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, ...email });
  if (error) throw new Error(`Resend refused the email: ${error.message}`);
}
