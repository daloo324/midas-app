import "server-only";
import {
  INVOICE_COLUMNS,
  toInvoice,
  type Invoice,
} from "@/lib/documents/money";
import {
  checkDue,
  type CampaignStatus,
  type ItemFormat,
  type Pillar,
  type WorkStatus,
} from "@/lib/content/constants";
import { createClient } from "@/lib/supabase/server";

// What the portal shows. Reads only the portal views (and the client's own
// kit and comments), which RLS limits to the client's own data. Every query
// also filters by clientId, so the CEO's preview shows exactly one client.

const SIGNED = 600; // signed URLs last 10 minutes (02-data-model.md)

export type PortalClient = {
  id: string;
  name: string;
  client_code: string;
  status: string;
  start_date: string | null;
  platforms: string[];
  monthly_fee: number | null;
  account_exec_name: string | null;
  account_exec_email: string | null;
  account_exec_phone: string | null;
  main_goal: string | null;
  baseline: Record<string, number>;
  service_name: string | null;
  service_inclusions: string[];
};

export async function getPortalClient(
  clientId: string,
): Promise<PortalClient | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_client")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (!data) return null;
  return {
    ...(data as unknown as PortalClient),
    platforms: data.platforms ?? [],
    baseline: (data.baseline ?? {}) as Record<string, number>,
    service_inclusions: (data.service_inclusions ?? []) as string[],
  };
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export type ItemApproval = {
  kind: "item";
  id: string;
  due: string;
  slot_code: string;
  format: ItemFormat;
  pillar: Pillar;
  scheduled_date: string | null;
  topic: string | null;
  caption: string | null;
  hashtags: string | null;
  graphic_copy: string | null;
  previewUrl: string | null;
  revision_rounds: number;
};

export type CalendarApproval = {
  kind: "calendar";
  monthId: string;
  month: string;
  due: string;
  rows: {
    slot_code: string;
    format: ItemFormat;
    scheduled_date: string | null;
    pillar: Pillar;
    topic: string | null;
  }[];
};

export type BriefApproval = {
  kind: "brief";
  campaignId: string;
  month: string;
  due: string;
  status: CampaignStatus;
  name: string | null;
  goal: string | null;
  offer: string | null;
  start_date: string | null;
  end_date: string | null;
  ad_budget: number | null;
  audience: Record<string, string>;
  message: Record<string, string>;
};

export type KitApproval = { kind: "kit"; due: string; kit: PortalKit };

export type Approval =
  ItemApproval | CalendarApproval | BriefApproval | KitApproval;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Everything waiting for the client, oldest deadline first (05-portal.md, "Approvals"). */
export async function listApprovals(clientId: string): Promise<Approval[]> {
  const supabase = await createClient();
  const [{ data: months }, { data: briefs }, { data: items }, kit] =
    await Promise.all([
      supabase
        .from("portal_months")
        .select("id, month")
        .eq("client_id", clientId)
        .eq("plan_status", "sent"),
      supabase
        .from("portal_campaigns")
        .select(
          "id, month, status, name, goal, offer, start_date, end_date, ad_budget, audience, message",
        )
        .eq("client_id", clientId)
        .eq("status", "sent"),
      supabase
        .from("portal_items")
        .select(
          "id, slot_code, format, pillar, scheduled_date, topic, caption, hashtags, graphic_copy, preview_path, revision_rounds, shown_to_client_at",
        )
        .eq("client_id", clientId)
        .eq("status", "client_review"),
      getPortalKit(clientId),
    ]);
  const monthIds = (months ?? []).map((m) => m.id!);
  const { data: rows } = monthIds.length
    ? await supabase
        .from("portal_calendar")
        .select("month_id, slot_code, format, scheduled_date, pillar, topic")
        .in("month_id", monthIds)
        .order("scheduled_date")
    : { data: [] };
  const paths = (items ?? [])
    .map((i) => i.preview_path)
    .filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("content").createSignedUrls(paths, SIGNED)
    : { data: [] };

  const list: Approval[] = [
    ...(items ?? []).map((i) => ({
      kind: "item" as const,
      id: i.id!,
      // Approve before it goes live; undated ads within 3 days of reaching the client.
      due: i.scheduled_date
        ? addDays(i.scheduled_date, -1)
        : addDays(i.shown_to_client_at!, 3),
      slot_code: i.slot_code!,
      format: i.format!,
      pillar: i.pillar!,
      scheduled_date: i.scheduled_date,
      topic: i.topic,
      caption: i.caption,
      hashtags: i.hashtags,
      graphic_copy: i.graphic_copy,
      previewUrl:
        signed?.find((s) => s.path === i.preview_path)?.signedUrl ?? null,
      revision_rounds: i.revision_rounds ?? 0,
    })),
    ...(months ?? []).map((m) => ({
      kind: "calendar" as const,
      monthId: m.id!,
      month: m.month!,
      due: checkDue("calendar_approved", m.month!, null)!,
      rows: (rows ?? [])
        .filter((r) => r.month_id === m.id)
        .map((r) => ({
          slot_code: r.slot_code!,
          format: r.format!,
          scheduled_date: r.scheduled_date,
          pillar: r.pillar!,
          topic: r.topic,
        })),
    })),
    ...(briefs ?? []).map((b) => ({
      kind: "brief" as const,
      campaignId: b.id!,
      month: b.month!,
      due: checkDue("brief_approved", b.month!, null)!,
      status: b.status!,
      name: b.name,
      goal: b.goal,
      offer: b.offer,
      start_date: b.start_date,
      end_date: b.end_date,
      ad_budget: b.ad_budget,
      audience: (b.audience ?? {}) as Record<string, string>,
      message: (b.message ?? {}) as Record<string, string>,
    })),
    ...(kit && kit.status === "client_review"
      ? [
          {
            kind: "kit" as const,
            due: addDays(kit.shownAt ?? new Date().toISOString(), 7),
            kit,
          },
        ]
      : []),
  ];
  return list.sort((a, b) => a.due.localeCompare(b.due));
}

export async function countApprovals(clientId: string): Promise<number> {
  const supabase = await createClient();
  const [
    { count: months },
    { count: briefs },
    { count: items },
    { count: kits },
  ] = await Promise.all([
    supabase
      .from("portal_months")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("plan_status", "sent"),
    supabase
      .from("portal_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "sent"),
    supabase
      .from("portal_items")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "client_review"),
    supabase
      .from("brand_kits")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "client_review"),
  ]);
  return (months ?? 0) + (briefs ?? 0) + (items ?? 0) + (kits ?? 0);
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export type PortalItem = {
  id: string;
  slot_code: string;
  format: ItemFormat;
  scheduled_date: string | null;
  pillar: Pillar;
  platform: string;
  topic: string | null;
  status: WorkStatus;
  caption: string | null;
  hashtags: string | null;
  graphic_copy: string | null;
  previewUrl: string | null;
};

async function withPreviews<T extends { preview_path: string | null }>(
  rows: T[],
) {
  const supabase = await createClient();
  const paths = rows
    .map((r) => r.preview_path)
    .filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("content").createSignedUrls(paths, SIGNED)
    : { data: [] };
  return rows.map((r) => ({
    ...r,
    previewUrl:
      signed?.find((s) => s.path === r.preview_path)?.signedUrl ?? null,
  }));
}

/** The month's work the client has been shown, by date. */
export async function monthItems(
  clientId: string,
  month: string,
): Promise<PortalItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_items")
    .select(
      "id, slot_code, format, scheduled_date, pillar, platform, topic, status, caption, hashtags, graphic_copy, preview_path",
    )
    .eq("client_id", clientId)
    .eq("month", month)
    .order("scheduled_date")
    .order("slot_code");
  return (
    await withPreviews(
      (data ?? []) as (Omit<PortalItem, "previewUrl"> & {
        preview_path: string | null;
      })[],
    )
  ).map(({ preview_path: _p, ...rest }) => {
    void _p;
    return rest;
  });
}

/** All 26 planned slots for the month (for "published of total"), once the calendar is sent. */
export async function monthTotals(clientId: string, month: string) {
  const supabase = await createClient();
  const [{ count: planned }, { data: shown }] = await Promise.all([
    supabase
      .from("portal_calendar")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("month", month),
    supabase
      .from("portal_items")
      .select("status, scheduled_date, slot_code, topic, format")
      .eq("client_id", clientId)
      .eq("month", month),
  ]);
  return { planned: planned ?? 0, shown: shown ?? [] };
}

export async function itemDetail(clientId: string, itemId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("portal_items")
    .select(
      "id, month, slot_code, format, scheduled_date, pillar, platform, topic, status, caption, hashtags, graphic_copy, preview_path",
    )
    .eq("client_id", clientId)
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return null;
  const [[withUrl], { data: history }, { data: comments }] = await Promise.all([
    withPreviews([item]),
    supabase
      .from("portal_item_history")
      .select("to_status, actor_kind, created_at")
      .eq("client_id", clientId)
      .eq("item_id", itemId)
      .order("created_at"),
    supabase
      .from("comments")
      .select("body, author_kind, created_at")
      .eq("client_id", clientId)
      .eq("entity_type", "content_item")
      .eq("entity_id", itemId)
      .eq("visible_to_client", true)
      .order("created_at"),
  ]);
  return { item: withUrl, history: history ?? [], comments: comments ?? [] };
}

// ---------------------------------------------------------------------------
// Campaigns and reports
// ---------------------------------------------------------------------------

export async function listCampaigns(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_campaigns")
    .select(
      "id, month, status, name, goal, offer, start_date, end_date, ad_budget, audience, results, results_metrics",
    )
    .eq("client_id", clientId)
    .order("month", { ascending: false });
  const list = (data ?? []).map((c) => ({
    ...c,
    audience: (c.audience ?? {}) as Record<string, string>,
    results_metrics: (c.results_metrics ?? {}) as Record<string, number>,
  }));
  const monthIds =
    (
      await supabase
        .from("portal_campaigns")
        .select("month_id")
        .eq("client_id", clientId)
    ).data?.map((r) => r.month_id!) ?? [];
  const { data: ads } = monthIds.length
    ? await supabase
        .from("portal_items")
        .select("month, slot_code, status")
        .eq("client_id", clientId)
        .like("slot_code", "A%")
    : { data: [] };
  return list.map((c) => ({
    ...c,
    ads: (ads ?? []).filter((a) => a.month === c.month),
  }));
}

export type PublishedReview = {
  month: string;
  published_at: string;
  working: string | null;
  adjust: string | null;
  top_piece: string | null;
  focus: string | null;
};

/** Published reviews, newest first, with each month's KPIs. */
export async function listReports(clientId: string) {
  const supabase = await createClient();
  const [{ data: months }, { data: kpis }] = await Promise.all([
    supabase
      .from("portal_months")
      .select("month, review, review_published_at")
      .eq("client_id", clientId)
      .not("review_published_at", "is", null)
      .order("month", { ascending: false }),
    supabase
      .from("portal_kpis")
      .select("month, metrics")
      .eq("client_id", clientId)
      .order("month"),
  ]);
  const reviews: PublishedReview[] = (months ?? []).map((m) => {
    const r = (m.review ?? {}) as Record<string, string>;
    return {
      month: m.month!,
      published_at: m.review_published_at!,
      working: r.working ?? null,
      adjust: r.adjust ?? null,
      top_piece: r.top_piece ?? null,
      focus: r.focus ?? null,
    };
  });
  return {
    reviews,
    kpis: (kpis ?? []).map((k) => ({
      month: k.month!,
      metrics: (k.metrics ?? {}) as Record<string, number>,
    })),
  };
}

/** The preview image of a month's top piece, by slot code, if the client has seen it. */
export async function topPiecePreview(
  clientId: string,
  month: string,
  slot: string | null,
) {
  if (!slot) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_items")
    .select("preview_path, topic")
    .eq("client_id", clientId)
    .eq("month", month)
    .eq("slot_code", slot)
    .maybeSingle();
  if (!data) return null;
  const [withUrl] = await withPreviews([data]);
  return { topic: data.topic, url: withUrl.previewUrl };
}

// ---------------------------------------------------------------------------
// Brand kit
// ---------------------------------------------------------------------------

export type PortalKitFile = {
  slot: string;
  file_name: string;
  mime_type: string | null;
  url: string | null;
};
export type PortalKit = {
  clientId: string;
  id: string;
  status: string;
  colors: Record<string, string>;
  heading_font: string | null;
  body_font: string | null;
  voice: string | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
  shownAt: string | null;
  files: PortalKitFile[];
};

/** The client's brand kit, with the files they're allowed to see (RLS decides which). */
export async function getPortalKit(
  clientId: string,
): Promise<PortalKit | null> {
  const supabase = await createClient();
  const { data: kit } = await supabase
    .from("brand_kits")
    .select(
      "id, client_id, status, colors, heading_font, body_font, voice, signed_off_by, signed_off_at, shown_to_client_at",
    )
    .eq("client_id", clientId)
    .maybeSingle();
  if (!kit) return null;
  // The CEO's preview sees what the client would: nothing before sign-off review.
  const visible = kit.status === "approved" || kit.status === "client_review";
  const { data: files } = visible
    ? await supabase
        .from("brand_kit_files")
        .select("slot, file_name, mime_type, storage_path")
        .eq("client_id", clientId)
        .order("slot")
    : { data: [] };
  const list = (files ?? []).filter(
    (f) =>
      kit.status === "approved" ||
      /^(logo|icon)_/.test(f.slot) ||
      f.slot === "guide_pdf",
  );
  const { data: signed } = list.length
    ? await supabase.storage.from("brand-kits").createSignedUrls(
        list.map((f) => f.storage_path),
        SIGNED,
      )
    : { data: [] };
  return {
    clientId: kit.client_id,
    id: kit.id,
    status: kit.status,
    colors: (kit.colors ?? {}) as Record<string, string>,
    heading_font: kit.heading_font,
    body_font: kit.body_font,
    voice: kit.voice,
    signed_off_by: kit.signed_off_by,
    signed_off_at: kit.signed_off_at,
    shownAt: kit.shown_to_client_at,
    files: list.map((f, i) => ({
      slot: f.slot,
      file_name: f.file_name,
      mime_type: f.mime_type,
      url: signed?.[i]?.signedUrl ?? null,
    })),
  };
}

export async function getBrief(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_briefs")
    .select("answers, submitted_at")
    .eq("client_id", clientId)
    .maybeSingle();
  return data
    ? {
        answers: (data.answers ?? []) as {
          section: string;
          question: string;
          answer: string;
        }[],
        submitted_at: data.submitted_at,
      }
    : null;
}

// ---------------------------------------------------------------------------
// Invoices (Phase 5). Drafts are filtered out here too, so the CEO's preview
// shows exactly what the client sees.
// ---------------------------------------------------------------------------

export async function listPortalInvoices(clientId: string): Promise<Invoice[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .eq("client_id", clientId)
    .neq("status", "draft")
    .order("issue_date", { ascending: false })
    .order("number", { ascending: false });
  return ((data ?? []) as unknown as Parameters<typeof toInvoice>[0][]).map(
    toInvoice,
  );
}

export type PortalBalance = {
  due: number;
  nextDue: string | null;
  overdue: boolean;
};

export function portalBalance(
  invoices: Invoice[],
  today: string,
): PortalBalance {
  const open = invoices
    .filter(
      (i) =>
        i.balance > 0 && (i.status === "issued" || i.status === "part_paid"),
    )
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  return {
    due: Math.round(open.reduce((a, i) => a + i.balance, 0) * 100) / 100,
    nextDue: open[0]?.due_date ?? null,
    overdue: open.some((i) => !!i.due_date && i.due_date < today),
  };
}
