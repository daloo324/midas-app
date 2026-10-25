import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl } from "@/lib/auth/links";
import { sendEmail } from "@/lib/email/send";
import {
  approvalsWaitingEmail,
  reminderEmail,
  type ReminderKind,
} from "@/lib/email/templates";
import { formatDay, formatMoney } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

// The scheduled jobs (07-integrations.md). Each runs with the service-role
// client (CLAUDE.md rule 3 allows it for cron jobs) and is safe to run twice:
// the retainer run is guarded in the database, emails by sent_emails.

type Db = SupabaseClient<Database>;

/** Days from a to b (calendar dates "2026-11-04"). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
  );
}

/** Monday-to-Friday days after `from` up to and including `to`. */
export function workingDaysBetween(from: string, to: string): number {
  let n = 0;
  const d = new Date(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  for (
    d.setUTCDate(d.getUTCDate() + 1);
    d.getTime() <= end;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) n += 1;
  }
  return n;
}

/** Which reminder an open invoice is due today, if any. */
export function reminderFor(
  dueDate: string,
  today: string,
): ReminderKind | null {
  const late = daysBetween(dueDate, today);
  if (late >= 7) return "overdue_7";
  if (late >= 1) return "overdue_1";
  if (late >= -3 && late <= -1) return "due_soon";
  return null;
}

/** Records an email as sent; false when it already was (so don't send again). */
async function claim(
  db: Db,
  kind: Database["public"]["Tables"]["sent_emails"]["Insert"]["kind"],
  ref: string,
) {
  const { data, error } = await db
    .from("sent_emails")
    .upsert({ kind, ref }, { onConflict: "kind,ref", ignoreDuplicates: true })
    .select("ref");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function unclaim(db: Db, kind: string, ref: string) {
  await db.from("sent_emails").delete().eq("kind", kind).eq("ref", ref);
}

// ---------------------------------------------------------------------------

/** 1st of the month, 06:00: a draft retainer invoice per active client. */
export async function retainerInvoices(db: Db, today: string) {
  const month = `${today.slice(0, 7)}-01`;
  const { data, error } = await db.rpc("create_retainer_drafts", {
    p_month: month,
  });
  if (error) throw new Error(error.message);
  return { month, drafts: data };
}

/** Daily, 08:00: due-soon and overdue reminders; flag expired quotes. */
export async function invoiceReminders(db: Db, today: string) {
  const { error: expireError } = await db.rpc("expire_quotes");
  if (expireError) throw new Error(expireError.message);
  const { data: settings } = await db
    .from("settings")
    .select("reminders_enabled, email")
    .eq("id", 1)
    .single();
  if (!settings?.reminders_enabled)
    return { sent: 0, skipped: "Reminders are switched off in settings." };

  const { data: open, error } = await db
    .from("invoices")
    .select(
      "id, number, due_date, balance, client:clients(name, contact_name, contact_email, reminders_enabled)",
    )
    .in("status", ["issued", "part_paid"])
    .gt("balance", 0);
  if (error) throw new Error(error.message);

  let sent = 0;
  const failed: string[] = [];
  for (const inv of open ?? []) {
    const c = inv.client;
    if (
      !inv.due_date ||
      !inv.number ||
      !c?.reminders_enabled ||
      !c.contact_email
    )
      continue;
    const kind = reminderFor(inv.due_date, today);
    if (!kind) continue;
    const key = `reminder_${kind}` as const;
    if (!(await claim(db, key, inv.id))) continue;
    try {
      await sendEmail(
        reminderEmail({
          to: c.contact_email,
          name: c.contact_name,
          number: inv.number,
          balance: formatMoney(inv.balance),
          dueDate: formatDay(inv.due_date),
          kind,
          portalUrl: `${appUrl()}/portal/invoices?view=${inv.number}`,
          from: "Midas Media",
          replyTo: settings.email ?? undefined,
        }),
      );
      sent += 1;
    } catch (e) {
      await unclaim(db, key, inv.id);
      failed.push(inv.number);
      console.error("Reminder failed", inv.number, e);
    }
  }
  return { sent, failed };
}

/**
 * Weekdays, 09:00: account execs get an in-app nudge for work waiting on the
 * client over 2 working days; clients with anything waiting get a short
 * reminder email, at most every 2 working days.
 */
export async function approvalNudges(db: Db, today: string) {
  const { data: nudged, error } = await db.rpc("notify_stale_client_reviews");
  if (error) throw new Error(error.message);

  const [items, months, campaigns, kits] = await Promise.all([
    db.from("content_items").select("client_id").eq("status", "client_review"),
    db.from("content_months").select("client_id").eq("plan_status", "sent"),
    db.from("campaigns").select("client_id").eq("status", "sent"),
    db.from("brand_kits").select("client_id").eq("status", "client_review"),
  ]);
  const waiting = new Map<string, number>();
  for (const r of [
    ...(items.data ?? []),
    ...(months.data ?? []),
    ...(campaigns.data ?? []),
    ...(kits.data ?? []),
  ])
    waiting.set(r.client_id, (waiting.get(r.client_id) ?? 0) + 1);
  if (!waiting.size) return { nudged, emailed: 0 };

  const ids = [...waiting.keys()];
  const [{ data: clients }, { data: logins }, { data: recent }] =
    await Promise.all([
      db
        .from("clients")
        .select(
          "id, status, ae:profiles!clients_account_exec_id_fkey(email, full_name)",
        )
        .in("id", ids),
      db
        .from("client_users")
        .select("client_id, email, full_name")
        .in("client_id", ids)
        .eq("active", true),
      db
        .from("sent_emails")
        .select("ref, sent_at")
        .eq("kind", "approvals_waiting"),
    ]);
  const lastSent = new Map<string, string>();
  for (const r of recent ?? []) {
    const [clientId, day] = r.ref.split(":");
    if (!lastSent.has(clientId) || lastSent.get(clientId)! < day)
      lastSent.set(clientId, day);
  }

  let emailed = 0;
  for (const c of clients ?? []) {
    if (c.status === "ended") continue;
    const last = lastSent.get(c.id);
    if (last && workingDaysBetween(last, today) < 2) continue;
    const to = (logins ?? []).filter((l) => l.client_id === c.id);
    if (!to.length) continue;
    const ref = `${c.id}:${today}`;
    if (!(await claim(db, "approvals_waiting", ref))) continue;
    try {
      for (const l of to)
        await sendEmail(
          approvalsWaitingEmail({
            to: l.email,
            name: l.full_name.split(/\s+/)[0] || l.full_name,
            count: waiting.get(c.id)!,
            portalUrl: `${appUrl()}/portal/approvals`,
            from: c.ae?.full_name ?? "Midas Media",
            replyTo: c.ae?.email ?? undefined,
          }),
        );
      emailed += 1;
    } catch (e) {
      await unclaim(db, "approvals_waiting", ref);
      console.error("Approvals email failed", c.id, e);
    }
  }
  return { nudged, emailed };
}

/** Sunday, 04:00: old sign-in attempts and unused expired questionnaire links. */
export async function cleanup(db: Db) {
  const { data, error } = await db.rpc("cleanup_old_records");
  if (error) throw new Error(error.message);
  return data;
}
