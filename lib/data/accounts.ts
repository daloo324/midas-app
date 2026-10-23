import "server-only";
import type {
  CampaignStatus,
  GoalCategory,
  KpiKey,
  PlanStatus,
  WorkStatus,
} from "@/lib/content/constants";
import { checklist, monthStats, type PlanItem } from "@/lib/content/month";
import { todayInGaborone } from "@/lib/format";
import type { ClientStatus } from "@/lib/format/status";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// Reads for the Account Desk (/accounts). Everything runs as the signed-in
// user: RLS limits an account exec to their own clients, the CEO sees all.

export type DeskCard = {
  id: string;
  name: string;
  industry: string | null;
  status: ClientStatus;
  accountExecName: string | null;
  month: {
    stats: ReturnType<typeof monthStats>;
    checksDone: number;
    planStatus: PlanStatus;
    campaignStatus: CampaignStatus | null;
    waitingOnYou: number;
    overdueClientApprovals: number;
  } | null;
  onboarding: {
    questionnaire: "not_sent" | "sent" | "opened" | "received";
    kitStatus: WorkStatus;
    logins: number;
  } | null;
};

const WAIT_DAYS = 2;

function workingDaysSince(iso: string, today: string): number {
  const start = new Date(
    `${new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Gaborone" })}T00:00:00Z`,
  );
  const end = new Date(`${today}T00:00:00Z`);
  let n = 0;
  for (const d = new Date(start); d < end;) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n += 1;
  }
  return n;
}

/** One card per client this person can see, needing action first. */
export async function listDeskCards(month: string): Promise<DeskCard[]> {
  const supabase = await createClient();
  const today = todayInGaborone();
  const { data: clients } = await supabase
    .from("clients")
    .select(
      "id, name, industry, status, account_exec:profiles!clients_account_exec_id_fkey(full_name)",
    )
    .neq("status", "ended")
    .order("name");
  if (!clients?.length) return [];
  const ids = clients.map((c) => c.id);

  const [
    { data: months },
    { data: kits },
    { data: invites },
    { data: briefs },
    { data: logins },
  ] = await Promise.all([
    supabase
      .from("content_months")
      .select(
        "id, client_id, month, plan_status, checklist, review_published_at, campaigns(status, start_date), content_items(id, slot_code, format, scheduled_date, pillar, topic, status)",
      )
      .in("client_id", ids)
      .eq("month", month),
    supabase
      .from("brand_kits")
      .select("client_id, status")
      .in("client_id", ids),
    supabase
      .from("questionnaire_invites")
      .select("client_id, opened_at, used_at, expires_at")
      .in("client_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("brand_briefs")
      .select("client_id, submitted_at")
      .in("client_id", ids),
    supabase
      .from("client_users")
      .select("client_id")
      .in("client_id", ids)
      .eq("active", true),
  ]);

  // When each item waiting on the client got there.
  const reviewIds = (months ?? []).flatMap((m) =>
    m.content_items
      .filter((i) => i.status === "client_review")
      .map((i) => i.id),
  );
  const { data: events } = reviewIds.length
    ? await supabase
        .from("status_events")
        .select("entity_id, created_at")
        .in("entity_id", reviewIds)
        .eq("to_status", "client_review")
    : { data: [] as { entity_id: string; created_at: string }[] };
  const sentAt = new Map<string, string>();
  for (const e of events ?? [])
    if (!sentAt.has(e.entity_id) || e.created_at > sentAt.get(e.entity_id)!)
      sentAt.set(e.entity_id, e.created_at);

  const cards: DeskCard[] = clients.map((c) => {
    const m = months?.find((x) => x.client_id === c.id);
    let month: DeskCard["month"] = null;
    if (m) {
      const items = m.content_items as PlanItem[];
      const campaign = m.campaigns ?? null;
      const steps = checklist(
        {
          month: m.month,
          items,
          planStatus: m.plan_status,
          campaign,
          reviewPublishedAt: m.review_published_at,
          manual: m.checklist as Record<string, boolean>,
        },
        today,
      );
      const regular = items.filter((i) => !i.slot_code.startsWith("A"));
      month = {
        stats: monthStats(items, today),
        checksDone: steps.filter((s) => s.done).length,
        planStatus: m.plan_status,
        campaignStatus: campaign?.status ?? null,
        // The account exec's own moves: schedule approved work, mark it published, send the calendar.
        waitingOnYou:
          regular.filter(
            (i) =>
              i.status === "approved" ||
              (i.status === "scheduled" && (i.scheduled_date ?? "9") <= today),
          ).length +
          (m.plan_status === "draft" ? 1 : 0) +
          steps.filter((s) => s.overdue && s.manual).length,
        overdueClientApprovals: regular.filter(
          (i) =>
            i.status === "client_review" &&
            sentAt.has(i.id) &&
            workingDaysSince(sentAt.get(i.id)!, today) > WAIT_DAYS,
        ).length,
      };
    }
    const invite = invites?.find((i) => i.client_id === c.id);
    const brief = briefs?.find((b) => b.client_id === c.id);
    const onboarding: DeskCard["onboarding"] =
      c.status === "onboarding" || c.status === "lead_won"
        ? {
            questionnaire: brief?.submitted_at
              ? "received"
              : !invite
                ? "not_sent"
                : invite.opened_at
                  ? "opened"
                  : "sent",
            kitStatus:
              kits?.find((k) => k.client_id === c.id)?.status ?? "planned",
            logins: logins?.filter((l) => l.client_id === c.id).length ?? 0,
          }
        : null;
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      status: c.status,
      accountExecName: c.account_exec?.full_name ?? null,
      month,
      onboarding,
    };
  });

  const weight = (c: DeskCard) => [
    c.month?.waitingOnYou ? 1 : 0,
    c.month?.overdueClientApprovals ?? 0,
  ];
  return cards.sort((a, b) => {
    const [aw, ao] = weight(a);
    const [bw, bo] = weight(b);
    return bw - aw || bo - ao || a.name.localeCompare(b.name);
  });
}

export type DeskClient = {
  id: string;
  name: string;
  client_code: string;
  industry: string | null;
  status: ClientStatus;
  account_exec_id: string | null;
  accountExecName: string | null;
  serviceName: string | null;
  monthly_fee: number | null;
  start_date: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  decision_maker: string | null;
  platforms: string[];
  pillar_mix: Record<string, number>;
  main_goal: GoalCategory | null;
  expectation_notes: string | null;
  baseline: Record<string, number>;
  kitStatus: WorkStatus;
};

export async function getDeskClient(id: string): Promise<DeskClient | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select(
      "id, name, client_code, industry, status, account_exec_id, monthly_fee, start_date, contact_name, contact_role, contact_email, contact_phone, decision_maker, platforms, pillar_mix, main_goal, expectation_notes, baseline, account_exec:profiles!clients_account_exec_id_fkey(full_name), service:services(name), brand_kits(status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  return {
    ...c,
    accountExecName: c.account_exec?.full_name ?? null,
    serviceName: c.service?.name ?? null,
    pillar_mix: (c.pillar_mix ?? {}) as Record<string, number>,
    baseline: (c.baseline ?? {}) as Record<string, number>,
    kitStatus: c.brand_kits?.status ?? "planned",
  };
}

export type DeskItem = PlanItem & {
  platform: string;
  notes: string | null;
  shown_to_client_at: string | null;
};

export type DeskCampaign = {
  id: string;
  status: CampaignStatus;
  name: string | null;
  goal: string | null;
  main_kpi: string | null;
  offer: string | null;
  start_date: string | null;
  end_date: string | null;
  ad_budget: number | null;
  ads_run_by: string | null;
  audience: Record<string, string>;
  message: Record<string, string>;
  creative_direction: string | null;
  launch: Record<string, string>;
  results: string | null;
  client_approved_at: string | null;
};

export type DeskMonth = {
  id: string;
  month: string;
  plan_status: PlanStatus;
  plan_sent_at: string | null;
  plan_approved_at: string | null;
  checklist: Record<string, boolean>;
  review: {
    working?: string;
    adjust?: string;
    top_piece?: string;
    focus?: string;
  };
  review_published_at: string | null;
  items: DeskItem[];
  campaign: DeskCampaign | null;
  feedback: { body: string; created_at: string; author_kind: string }[];
};

const asRecord = (j: Json | null) =>
  j && typeof j === "object" && !Array.isArray(j)
    ? (j as Record<string, string>)
    : {};

/** The month's plan, items and campaign, or null if it isn't started. */
export async function getDeskMonth(
  clientId: string,
  month: string,
): Promise<DeskMonth | null> {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("content_months")
    .select(
      "id, month, plan_status, plan_sent_at, plan_approved_at, checklist, review, review_published_at, content_items(id, slot_code, format, scheduled_date, pillar, topic, platform, notes, status, shown_to_client_at), campaigns(id, status, name, goal, main_kpi, offer, start_date, end_date, ad_budget, ads_run_by, audience, message, creative_direction, launch, results, client_approved_at)",
    )
    .eq("client_id", clientId)
    .eq("month", month)
    .maybeSingle();
  if (!m) return null;
  const { data: feedback } = await supabase
    .from("comments")
    .select("body, created_at, author_kind")
    .eq("entity_type", "content_month")
    .eq("entity_id", m.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const campaign = m.campaigns
    ? {
        ...m.campaigns,
        audience: asRecord(m.campaigns.audience),
        message: asRecord(m.campaigns.message),
        launch: asRecord(m.campaigns.launch),
      }
    : null;
  return {
    ...m,
    checklist: (m.checklist ?? {}) as Record<string, boolean>,
    review: asRecord(m.review),
    items: [...m.content_items].sort((a, b) =>
      a.slot_code.localeCompare(b.slot_code),
    ),
    campaign,
    feedback: feedback ?? [],
  };
}

export type DeskKpis = {
  metrics: Partial<Record<KpiKey, number>>;
  sources: Partial<Record<KpiKey, string>>;
  locked: boolean;
  exists: boolean;
  previous: Partial<Record<KpiKey, number>> | null;
  calc: {
    net_new_followers: number | null;
    published: number | null;
    planned: number | null;
    first_round_rate: number | null;
    engagement_rate: number | null;
    cost_per_result: number | null;
  } | null;
  previousCalc: DeskKpis["calc"];
};

export async function getDeskKpis(
  clientId: string,
  month: string,
  previousMonth: string,
): Promise<DeskKpis> {
  const supabase = await createClient();
  const [{ data: rows }, { data: calcs }] = await Promise.all([
    supabase
      .from("kpi_months")
      .select("month, metrics, sources, locked")
      .eq("client_id", clientId)
      .in("month", [month, previousMonth]),
    supabase
      .from("kpi_months_calc")
      .select(
        "month, net_new_followers, published, planned, first_round_rate, engagement_rate, cost_per_result",
      )
      .eq("client_id", clientId)
      .in("month", [month, previousMonth]),
  ]);
  const cur = rows?.find((r) => r.month === month);
  const prev = rows?.find((r) => r.month === previousMonth);
  const pick = (m: string) => {
    const c = calcs?.find((x) => x.month === m);
    return c
      ? { ...c, published: c.published ?? null, planned: c.planned ?? null }
      : null;
  };
  return {
    metrics: (cur?.metrics ?? {}) as DeskKpis["metrics"],
    sources: (cur?.sources ?? {}) as DeskKpis["sources"],
    locked: cur?.locked ?? false,
    exists: Boolean(cur),
    previous: prev ? (prev.metrics as DeskKpis["metrics"]) : null,
    calc: pick(month),
    previousCalc: pick(previousMonth),
  };
}

export type Onboarding = {
  brief: {
    answers: { section: string; question: string; answer: string }[];
    uploads: {
      path: string;
      note: string;
      question: string;
      section: string;
      url: string | null;
    }[];
    submitted_at: string | null;
  } | null;
  invite: {
    token: string;
    expires_at: string;
    opened_at: string | null;
    used_at: string | null;
    created_at: string;
  } | null;
};

export async function getOnboarding(clientId: string): Promise<Onboarding> {
  const supabase = await createClient();
  const [{ data: brief }, { data: invite }] = await Promise.all([
    supabase
      .from("brand_briefs")
      .select("answers, uploads, submitted_at")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("questionnaire_invites")
      .select("token, expires_at, opened_at, used_at, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  let uploads: NonNullable<Onboarding["brief"]>["uploads"] = [];
  const raw = (brief?.uploads ?? []) as {
    path: string;
    note?: string;
    question?: string;
    section?: string;
  }[];
  if (raw.length) {
    // Signed URLs for 10 minutes (02-data-model.md, "Storage buckets").
    const { data: signed } = await supabase.storage
      .from("briefs")
      .createSignedUrls(
        raw.map((u) => u.path),
        600,
      );
    uploads = raw.map((u, i) => ({
      path: u.path,
      note: u.note ?? "",
      question: u.question ?? "",
      section: u.section ?? "",
      url: signed?.[i]?.signedUrl ?? null,
    }));
  }
  return {
    brief: brief
      ? {
          answers: (brief.answers ?? []) as NonNullable<
            Onboarding["brief"]
          >["answers"],
          uploads,
          submitted_at: brief.submitted_at,
        }
      : null,
    invite: invite ?? null,
  };
}

export type Notice = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listNotifications(
  limit = 20,
): Promise<{ items: Notice[]; unread: number }> {
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  return { items: data ?? [], unread: count ?? 0 };
}

/** Published items of the month, for the review's "top piece" picker. */
export async function publishedItems(clientId: string, month: string) {
  const m = await getDeskMonth(clientId, month);
  return (m?.items ?? []).filter((i) => i.status === "published");
}
