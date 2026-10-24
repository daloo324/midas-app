"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/auth/action-state";
import { resendClientWelcome } from "@/lib/auth/admin";
import { appUrl } from "@/lib/auth/links";
import { getCurrentUser, staffWithRole } from "@/lib/auth/session";
import { monthLabel, monthParam } from "@/lib/content/constants";
import { friendlyError } from "@/lib/data/errors";
import { sendEmail } from "@/lib/email/send";
import { reviewPublishedEmail } from "@/lib/email/templates";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  campaignField,
  campaignMove,
  checkToggle,
  itemField,
  itemMove,
  kpiField,
  monthValue,
  profileField,
  reviewField,
  uuid,
} from "@/lib/validation/accounts";

// Every change on the Account Desk. Each one checks the role here, then runs
// as the signed-in user so RLS and the database guards decide the rest.

const NOT_ALLOWED: ActionState = {
  error: "Only the CEO or this client's account exec can do this.",
};
const BAD_INPUT: ActionState = {
  error: "Something went wrong. Reload the page and try again.",
};

async function deskUser() {
  return staffWithRole(["ceo", "account_exec"]);
}

function refresh() {
  revalidatePath("/accounts", "layout");
}

const first = (issues: { message: string }[]) =>
  issues[0]?.message ?? BAD_INPUT.error!;

// ---------------------------------------------------------------------------
// Months and items
// ---------------------------------------------------------------------------

export async function startMonthAction(
  clientId: string,
  month: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(clientId).success || !monthValue.safeParse(month).success)
    return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_month", {
    p_client_id: clientId,
    p_month: month,
  });
  if (error)
    return {
      error: friendlyError(error, "The month couldn't be started. Try again."),
    };
  refresh();
  redirect(`/accounts/clients/${clientId}/calendar?month=${monthParam(month)}`);
}

export async function saveItemAction(
  itemId: string,
  field: string,
  value: unknown,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = itemField.safeParse({ field, value });
  if (!parsed.success || !uuid.safeParse(itemId).success)
    return {
      error: parsed.success ? BAD_INPUT.error : first(parsed.error.issues),
    };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      [parsed.data.field]: parsed.data.value,
    } as TablesUpdate<"content_items">)
    .eq("id", itemId)
    .select("id");
  if (error || !data?.length)
    return {
      error: friendlyError(error, "That change didn't save. Try again."),
    };
  refresh();
  return { ok: "Saved." };
}

export async function moveItemAction(input: unknown): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = itemMove.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_content_status", {
    p_item_id: parsed.data.itemId,
    p_new_status: parsed.data.status,
    p_comment: parsed.data.note ?? undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "The status didn't change. Try again."),
    };
  refresh();
  return { ok: "Status changed." };
}

export async function sendCalendarAction(
  monthId: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(monthId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_calendar", {
    p_month_id: monthId,
  });
  if (error)
    return {
      error: friendlyError(error, "The calendar didn't send. Try again."),
    };
  refresh();
  return { ok: "Sent to the client for approval. It's in their portal now." };
}

export async function toggleCheckAction(input: unknown): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = checkToggle.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("content_months")
    .select("checklist")
    .eq("id", parsed.data.monthId)
    .maybeSingle();
  if (!m) return NOT_ALLOWED;
  const checklist = {
    ...(m.checklist as Record<string, boolean>),
    [parsed.data.key]: parsed.data.done,
  };
  const { error } = await supabase
    .from("content_months")
    .update({ checklist })
    .eq("id", parsed.data.monthId);
  if (error)
    return { error: friendlyError(error, "That tick didn't save. Try again.") };
  refresh();
  return { ok: "Saved." };
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export async function createCampaignAction(
  monthId: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(monthId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_campaign", {
    p_month_id: monthId,
  });
  if (error)
    return {
      error: friendlyError(
        error,
        "The campaign couldn't be created. Try again.",
      ),
    };
  refresh();
  return { ok: "Campaign created, with A01–A03 in the calendar." };
}

export async function saveCampaignAction(
  campaignId: string,
  key: string,
  value: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = campaignField.safeParse({ key, value });
  if (!parsed.success || !uuid.safeParse(campaignId).success)
    return {
      error: parsed.success ? BAD_INPUT.error : first(parsed.error.issues),
    };
  const supabase = await createClient();
  const [group, sub] = parsed.data.key.split(".") as [
    string,
    string | undefined,
  ];
  let patch: Record<string, unknown>;
  if (sub) {
    // A part of a JSON group (audience, message, launch): merge it in.
    const { data: row } = await supabase
      .from("campaigns")
      .select("audience, message, launch")
      .eq("id", campaignId)
      .maybeSingle();
    if (!row) return NOT_ALLOWED;
    const current = {
      ...((row as Record<string, Json>)[group] as Record<string, string>),
    };
    if (parsed.data.value === null) delete current[sub];
    else current[sub] = String(parsed.data.value);
    patch = { [group]: current };
  } else {
    patch = { [group]: parsed.data.value };
  }
  const { data, error } = await supabase
    .from("campaigns")
    .update(patch as TablesUpdate<"campaigns">)
    .eq("id", campaignId)
    .select("id");
  if (error || !data?.length)
    return {
      error: friendlyError(error, "That change didn't save. Try again."),
    };
  refresh();
  return { ok: "Saved." };
}

export async function campaignStatusAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = campaignMove.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_campaign_status", {
    p_campaign_id: parsed.data.campaignId,
    p_new_status: parsed.data.status,
    p_launch_checks_done: parsed.data.checks,
  });
  if (error)
    return {
      error: friendlyError(
        error,
        "The brief's status didn't change. Try again.",
      ),
    };
  refresh();
  const done: Record<string, string> = {
    sent: "Sent to the client. It's in their portal now.",
    live: "The campaign is live.",
    complete: "Campaign complete.",
    draft: "Back to draft.",
  };
  return { ok: done[parsed.data.status] };
}

// ---------------------------------------------------------------------------
// KPIs and review
// ---------------------------------------------------------------------------

export async function saveKpiAction(input: unknown): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = kpiField.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const { clientId, month, key, value } = parsed.data;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("kpi_months")
    .select("id, metrics, sources")
    .eq("client_id", clientId)
    .eq("month", month)
    .maybeSingle();
  const metrics = { ...((row?.metrics as Record<string, number>) ?? {}) };
  const sources = { ...((row?.sources as Record<string, string>) ?? {}) };
  if (value === null) {
    delete metrics[key];
    delete sources[key];
  } else {
    metrics[key] = value;
    sources[key] = "manual";
  }
  const { error } = row
    ? await supabase
        .from("kpi_months")
        .update({ metrics, sources })
        .eq("id", row.id)
    : await supabase
        .from("kpi_months")
        .insert({ client_id: clientId, month, metrics, sources });
  if (error)
    return {
      error: friendlyError(error, "That number didn't save. Try again."),
    };
  refresh();
  return { ok: "Saved." };
}

export async function saveReviewAction(input: unknown): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = reviewField.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("content_months")
    .select("review")
    .eq("id", parsed.data.monthId)
    .maybeSingle();
  if (!m) return NOT_ALLOWED;
  const review = { ...(m.review as Record<string, string>) };
  if (parsed.data.value) review[parsed.data.key] = parsed.data.value;
  else delete review[parsed.data.key];
  const { error } = await supabase
    .from("content_months")
    .update({ review })
    .eq("id", parsed.data.monthId);
  if (error)
    return { error: friendlyError(error, "That didn't save. Try again.") };
  refresh();
  return { ok: "Saved." };
}

export async function publishReviewAction(
  monthId: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(monthId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_review", {
    p_month_id: monthId,
  });
  if (error)
    return {
      error: friendlyError(error, "The review didn't publish. Try again."),
    };
  refresh();
  await emailReviewPublished(monthId);
  return {
    ok: "Published. The client can see it in their portal, and this month's KPIs are locked.",
  };
}

/** Emails the client's logins that their review is ready. Best effort. */
async function emailReviewPublished(monthId: string) {
  try {
    const me = await getCurrentUser();
    const supabase = await createClient();
    const { data: m } = await supabase
      .from("content_months")
      .select("client_id, month")
      .eq("id", monthId)
      .single();
    if (!m) return;
    const { data: logins } = await supabase
      .from("client_users")
      .select("email, full_name")
      .eq("client_id", m.client_id)
      .eq("active", true);
    for (const l of logins ?? [])
      await sendEmail(
        reviewPublishedEmail({
          to: l.email,
          name: l.full_name.split(/\s+/)[0] || l.full_name,
          month: monthLabel(m.month),
          portalUrl: `${appUrl()}/portal/reports?month=${m.month.slice(0, 7)}`,
          from: me?.name ?? "Midas Media",
          replyTo: me?.kind === "staff" ? me.email : undefined,
        }),
      );
  } catch (e) {
    console.error("Review email failed", monthId, e);
  }
}

export async function unpublishReviewAction(
  monthId: string,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"])))
    return { error: "Only the CEO can unpublish a review." };
  if (!uuid.safeParse(monthId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("unpublish_review", {
    p_month_id: monthId,
  });
  if (error)
    return {
      error: friendlyError(error, "The review didn't unpublish. Try again."),
    };
  refresh();
  return { ok: "Unpublished. The KPIs can be edited again." };
}

// ---------------------------------------------------------------------------
// Client profile and onboarding
// ---------------------------------------------------------------------------

export async function saveProfileAction(
  clientId: string,
  field: string,
  value: unknown,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  const parsed = profileField.safeParse({ field, value });
  if (!parsed.success || !uuid.safeParse(clientId).success)
    return {
      error: parsed.success ? BAD_INPUT.error : first(parsed.error.issues),
    };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      [parsed.data.field]: parsed.data.value,
    } as TablesUpdate<"clients">)
    .eq("id", clientId)
    .select("id");
  if (error || !data?.length)
    return {
      error: friendlyError(error, "That change didn't save. Try again."),
    };
  refresh();
  return { ok: "Saved." };
}

export async function createQuestionnaireLinkAction(
  clientId: string,
): Promise<ActionState & { link?: string }> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(clientId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_questionnaire_invite", {
    p_client_id: clientId,
  });
  if (error || !data)
    return {
      error: friendlyError(error, "The link couldn't be made. Try again."),
    };
  refresh();
  return {
    ok: "New link ready. Any older link has stopped working.",
    link: `${appUrl()}/start/${data}`,
  };
}

export async function activateClientAction(
  clientId: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(clientId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_client", {
    p_client_id: clientId,
  });
  if (error)
    return {
      error: friendlyError(
        error,
        "The client couldn't be activated. Try again.",
      ),
    };
  refresh();
  return { ok: "Active. You can start planning months now." };
}

export async function resendWelcomeAction(
  clientUserId: string,
): Promise<ActionState> {
  if (!(await deskUser())) return NOT_ALLOWED;
  if (!uuid.safeParse(clientUserId).success) return BAD_INPUT;
  // RLS read first: it proves the caller may manage this client's logins.
  const supabase = await createClient();
  const { data: login } = await supabase
    .from("client_users")
    .select("id")
    .eq("id", clientUserId)
    .maybeSingle();
  if (!login) return NOT_ALLOWED;
  const result = await resendClientWelcome(clientUserId);
  return result.ok ? { ok: result.message } : { error: result.error };
}

export async function markNotificationsReadAction(): Promise<void> {
  if (
    !(await staffWithRole([
      "ceo",
      "account_exec",
      "creative_director",
      "designer",
    ]))
  )
    return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  refresh();
}
