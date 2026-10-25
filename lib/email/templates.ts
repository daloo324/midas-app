// Plain, short emails in the Midas look: navy band with the gold rule.

import type { Email } from "./send";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(label: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F2F4F5;font-family:Figtree,'Segoe UI',Arial,sans-serif;color:#13252E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #D8DFE2;border-radius:12px;overflow:hidden">
<tr><td style="background:#0E2A36;border-bottom:3px solid #B88A35;padding:16px 24px;color:#FFFFFF">
<span style="font-family:Archivo,'Arial Narrow',Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:.02em">MIDAS</span>
<span style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#B88A35;margin-left:8px">${escapeHtml(label)}</span>
</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.5">${bodyHtml}</td></tr>
</table>
<p style="font-size:12px;color:#5A6A72;margin:16px 0 0">Midas Media Solutions · Gaborone</p>
</td></tr></table></body></html>`;
}

function button(href: string, text: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0E2A36;color:#FFFFFF;text-decoration:none;font-weight:600;border-radius:999px;padding:12px 22px">${escapeHtml(text)}</a></p>`;
}

const LINK_NOTE =
  "This link works once and expires in 24 hours. If it has expired, ask for a new one.";

export function staffInviteEmail(opts: {
  to: string;
  name: string;
  roleLabel: string;
  link: string;
}): Email {
  const { to, name, roleLabel, link } = opts;
  return {
    to,
    subject: "You're invited to the Midas Media app",
    html: layout(
      "Team",
      `<p>Hi ${escapeHtml(name)},</p>
<p>You've been added to the Midas Media app as <b>${escapeHtml(roleLabel)}</b>. Set your password to sign in.</p>
${button(link, "Set your password")}
<p style="font-size:13px;color:#5A6A72">${LINK_NOTE}</p>`,
    ),
    text: `Hi ${name},\n\nYou've been added to the Midas Media app as ${roleLabel}. Set your password to sign in:\n${link}\n\n${LINK_NOTE}`,
  };
}

export function clientWelcomeEmail(opts: {
  to: string;
  name: string;
  clientName: string;
  loginId: string;
  link: string;
  accountExecName: string | null;
}): Email {
  const { to, name, clientName, loginId, link, accountExecName } = opts;
  const askLine = accountExecName
    ? `Questions? Ask ${accountExecName}, your account exec.`
    : "";
  return {
    to,
    subject: "Your Midas Media client portal",
    html: layout(
      "Client portal",
      `<p>Hi ${escapeHtml(name)},</p>
<p>Your client portal for <b>${escapeHtml(clientName)}</b> is ready. This is where you approve work, follow progress and see reports.</p>
<p style="margin:20px 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5A6A72;font-weight:700">Your client ID</p>
<p style="margin:0;font-family:Archivo,'Arial Narrow',Arial,sans-serif;font-weight:800;font-size:24px;letter-spacing:.03em">${escapeHtml(loginId)}</p>
<p>You sign in with this ID and a password you choose. Set your password now:</p>
${button(link, "Set your password")}
<p style="font-size:13px;color:#5A6A72">${LINK_NOTE}</p>
${askLine ? `<p>${escapeHtml(askLine)}</p>` : ""}`,
    ),
    text: `Hi ${name},\n\nYour client portal for ${clientName} is ready.\n\nYour client ID: ${loginId}\n\nYou sign in with this ID and a password you choose. Set your password now:\n${link}\n\n${LINK_NOTE}${askLine ? `\n\n${askLine}` : ""}`,
  };
}

export function passwordResetEmail(opts: {
  to: string;
  name: string;
  link: string;
  loginId?: string;
}): Email {
  const { to, name, link, loginId } = opts;
  const idLine = loginId ? `Your client ID is ${loginId}.` : "";
  return {
    to,
    subject: "Reset your Midas Media password",
    html: layout(
      loginId ? "Client portal" : "Team",
      `<p>Hi ${escapeHtml(name)},</p>
<p>Someone asked to reset your password. If it was you, choose a new one:</p>
${button(link, "Choose a new password")}
${idLine ? `<p>${escapeHtml(idLine)}</p>` : ""}
<p style="font-size:13px;color:#5A6A72">${LINK_NOTE} If you didn't ask for this, ignore this email; your password stays the same.</p>`,
    ),
    text: `Hi ${name},\n\nSomeone asked to reset your password. If it was you, choose a new one:\n${link}\n\n${idLine ? idLine + "\n\n" : ""}${LINK_NOTE} If you didn't ask for this, ignore this email; your password stays the same.`,
  };
}

// ---------------------------------------------------------------------------
// Phase 5: quotes, invoices, reminders and workflow emails
// ---------------------------------------------------------------------------

function paragraphs(lines: string[]): string {
  return lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("\n");
}

function signOff(from: string): string {
  return `<p style="font-size:13px;color:#5A6A72">Questions? Reply to this email to reach ${escapeHtml(from)}.</p>`;
}

export function quoteEmail(opts: {
  to: string;
  name: string | null;
  number: string;
  total: string;
  validUntil: string;
  from: string;
  replyTo?: string;
  pdf: Buffer;
}): Email {
  const hi = `Hi ${opts.name || "there"},`;
  const body = [
    hi,
    `Here is quote ${opts.number} from Midas Media for ${opts.total}. It's attached as a PDF and is valid until ${opts.validUntil}.`,
    "To go ahead, reply to this email and we'll get started.",
  ];
  return {
    to: opts.to,
    replyTo: opts.replyTo,
    subject: `Quote ${opts.number} from Midas Media`,
    html: layout("Quote", paragraphs(body) + signOff(opts.from)),
    text: `${body.join("\n\n")}\n\nQuestions? Reply to this email to reach ${opts.from}.`,
    attachments: [{ filename: `${opts.number}.pdf`, content: opts.pdf }],
  };
}

export function invoiceEmail(opts: {
  to: string;
  name: string | null;
  number: string;
  title: string;
  total: string;
  dueDate: string;
  portalUrl: string;
  from: string;
  replyTo?: string;
  pdf: Buffer;
}): Email {
  const body = [
    `Hi ${opts.name || "there"},`,
    `${opts.title} ${opts.number} for ${opts.total} is attached. Please pay by ${opts.dueDate}, using ${opts.number} as the payment reference.`,
    "You can also see it, and every invoice, in your client portal.",
  ];
  return {
    to: opts.to,
    replyTo: opts.replyTo,
    subject: `${opts.title} ${opts.number} from Midas Media`,
    html: layout(
      "Invoice",
      paragraphs(body) +
        button(opts.portalUrl, "View in your portal") +
        signOff(opts.from),
    ),
    text: `${body.join("\n\n")}\n${opts.portalUrl}\n\nQuestions? Reply to this email to reach ${opts.from}.`,
    attachments: [{ filename: `${opts.number}.pdf`, content: opts.pdf }],
  };
}

export type ReminderKind = "due_soon" | "overdue_1" | "overdue_7";

export function reminderEmail(opts: {
  to: string;
  name: string | null;
  number: string;
  balance: string;
  dueDate: string;
  kind: ReminderKind;
  portalUrl: string;
  from: string;
  replyTo?: string;
}): Email {
  const line =
    opts.kind === "due_soon"
      ? `A friendly reminder that invoice ${opts.number} (${opts.balance} to pay) is due on ${opts.dueDate}.`
      : opts.kind === "overdue_1"
        ? `Invoice ${opts.number} was due on ${opts.dueDate} and ${opts.balance} is still to pay.`
        : `Invoice ${opts.number} is now a week overdue, with ${opts.balance} still to pay. Please pay as soon as you can, or reply if something is wrong with it.`;
  const body = [
    `Hi ${opts.name || "there"},`,
    line,
    `Use ${opts.number} as the payment reference. If you've already paid, thank you, and please ignore this email.`,
  ];
  return {
    to: opts.to,
    replyTo: opts.replyTo,
    subject:
      opts.kind === "due_soon"
        ? `Invoice ${opts.number} is due on ${opts.dueDate}`
        : `Invoice ${opts.number} is overdue`,
    html: layout(
      "Invoice",
      paragraphs(body) +
        button(opts.portalUrl, "View the invoice") +
        signOff(opts.from),
    ),
    text: `${body.join("\n\n")}\n${opts.portalUrl}`,
  };
}

/** To a client: work has been waiting for their OK for more than 2 working days. */
export function approvalsWaitingEmail(opts: {
  to: string;
  name: string;
  count: number;
  portalUrl: string;
  from: string;
  replyTo?: string;
}): Email {
  const what = opts.count === 1 ? "1 item is" : `${opts.count} items are`;
  const body = [
    `Hi ${opts.name},`,
    `${what} waiting for your approval in the Midas client portal. Nothing is posted without your OK, so a quick look keeps your content on schedule.`,
  ];
  return {
    to: opts.to,
    replyTo: opts.replyTo,
    subject: `${what} waiting for your approval`,
    html: layout(
      "Client portal",
      paragraphs(body) +
        button(opts.portalUrl, "Review and approve") +
        signOff(opts.from),
    ),
    text: `${body.join("\n\n")}\n${opts.portalUrl}`,
  };
}

/** To the account exec: a client asked for changes. */
export function changesRequestedEmail(opts: {
  to: string;
  name: string;
  clientName: string;
  what: string;
  comment: string;
  link: string;
}): Email {
  const body = [
    `Hi ${opts.name},`,
    `${opts.clientName} asked for changes to ${opts.what}:`,
  ];
  return {
    to: opts.to,
    subject: `${opts.clientName} asked for changes to ${opts.what}`,
    html: layout(
      "Account Desk",
      `${paragraphs(body)}<blockquote style="margin:0;padding:10px 14px;border-left:3px solid #B88A35;background:#F4ECDC">${escapeHtml(opts.comment)}</blockquote>${button(opts.link, "Open it")}<p style="font-size:13px;color:#5A6A72">Reply to the client within 48 hours.</p>`,
    ),
    text: `${body.join("\n\n")}\n\n"${opts.comment}"\n\n${opts.link}\n\nReply to the client within 48 hours.`,
  };
}

/** To a client: their monthly review is ready. */
export function reviewPublishedEmail(opts: {
  to: string;
  name: string;
  month: string;
  portalUrl: string;
  from: string;
  replyTo?: string;
}): Email {
  const body = [
    `Hi ${opts.name},`,
    `Your ${opts.month} review is ready: what we posted, how it performed and what we'll do next month.`,
  ];
  return {
    to: opts.to,
    replyTo: opts.replyTo,
    subject: `Your ${opts.month} review is ready`,
    html: layout(
      "Client portal",
      paragraphs(body) +
        button(opts.portalUrl, "Read your review") +
        signOff(opts.from),
    ),
    text: `${body.join("\n\n")}\n${opts.portalUrl}`,
  };
}
