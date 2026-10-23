import "server-only";
import { sendEmail, type Email } from "@/lib/email/send";

/** In demo mode, emails go out only if Resend (or a local outbox) is set up. */
export async function demoSend(
  email: Email,
): Promise<"sent" | "skipped" | "failed"> {
  if (!process.env.EMAIL_OUTBOX_DIR && !process.env.RESEND_API_KEY)
    return "skipped";
  try {
    await sendEmail(email);
    return "sent";
  } catch {
    return "failed";
  }
}

export function demoEmailNote(
  outcome: "sent" | "skipped" | "failed",
  to: string,
) {
  if (outcome === "sent") return `Email sent to ${to}.`;
  if (outcome === "failed")
    return `The email to ${to} didn't send (Resend's test sender only reaches your own address).`;
  return "Demo mode: no email sent.";
}
