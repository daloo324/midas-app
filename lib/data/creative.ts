import "server-only";
import type { PlanStatus, WorkStatus } from "@/lib/content/constants";
import { KIT_TOTAL } from "@/lib/creative/constants";
import type { ClientStatus } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

// Reads for the Design Studio (/creative). Runs as the signed-in user: the
// creative team sees every client (RLS), clients and account execs don't
// reach these pages.

const SIGNED_URL_SECONDS = 600;

type Kit = {
  status: WorkStatus;
  colors: Record<string, string>;
  heading_font: string | null;
  body_font: string | null;
  voice: string | null;
  guide_checks: Record<string, boolean>;
  signed_off_by: string | null;
  signed_off_at: string | null;
  assigned_designer_id: string | null;
};

/** Items ready out of 25, from the kit's colours and its files' slots. */
export function kitProgress(
  colors: Record<string, string>,
  slots: string[],
): number {
  const marks = new Set(slots.filter((s) => /^(logo|icon)_/.test(s))).size;
  const fontRoles = new Set(
    slots.filter((s) => s.startsWith("font_")).map((s) => s.split("_")[1]),
  ).size;
  const guide = slots.includes("guide_pdf") ? 1 : 0;
  return Math.min(
    KIT_TOTAL,
    marks + Object.keys(colors).length + fontRoles + guide,
  );
}

export type StudioCard = {
  id: string;
  name: string;
  industry: string | null;
  status: ClientStatus;
  kit: {
    status: WorkStatus;
    colors: Record<string, string>;
    heading_font: string | null;
    body_font: string | null;
    ready: number;
  };
  month: {
    total: number;
    done: number;
    byStatus: Partial<Record<WorkStatus, number>>;
    planStatus: PlanStatus;
    minutes: number;
  } | null;
};

export async function listStudioCards(month: string): Promise<StudioCard[]> {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, industry, status")
    .neq("status", "ended")
    .order("name");
  if (!clients?.length) return [];
  const ids = clients.map((c) => c.id);
  const [{ data: kits }, { data: files }, { data: months }] = await Promise.all(
    [
      supabase
        .from("brand_kits")
        .select("client_id, status, colors, heading_font, body_font")
        .in("client_id", ids),
      supabase
        .from("brand_kit_files")
        .select("client_id, slot")
        .in("client_id", ids),
      supabase
        .from("content_months")
        .select("client_id, plan_status, content_items(status, slot_code)")
        .in("client_id", ids)
        .eq("month", month),
    ],
  );
  const minutes = await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabase.rpc("client_time", {
        p_client_id: id,
        p_month: month,
      });
      return (data ?? [])
        .filter((r) => !r.is_brand_kit)
        .reduce((a, r) => a + Number(r.minutes), 0);
    }),
  );
  return clients.map((c, i) => {
    const k = kits?.find((x) => x.client_id === c.id);
    const colors = (k?.colors ?? {}) as Record<string, string>;
    const m = months?.find((x) => x.client_id === c.id);
    let monthInfo: StudioCard["month"] = null;
    if (m) {
      const byStatus: Partial<Record<WorkStatus, number>> = {};
      for (const it of m.content_items)
        byStatus[it.status] = (byStatus[it.status] ?? 0) + 1;
      monthInfo = {
        total: m.content_items.length,
        done: m.content_items.filter((it) =>
          ["approved", "scheduled", "published"].includes(it.status),
        ).length,
        byStatus,
        planStatus: m.plan_status,
        minutes: minutes[i],
      };
    }
    return {
      ...c,
      kit: {
        status: k?.status ?? "planned",
        colors,
        heading_font: k?.heading_font ?? null,
        body_font: k?.body_font ?? null,
        ready: kitProgress(
          colors,
          (files ?? []).filter((f) => f.client_id === c.id).map((f) => f.slot),
        ),
      },
      month: monthInfo,
    };
  });
}

export type KitFile = {
  id: string;
  slot: string;
  file_name: string;
  size_bytes: number;
  mime_type: string | null;
  storage_path: string;
  url: string | null;
};

export type StudioClient = {
  id: string;
  name: string;
  industry: string | null;
  status: ClientStatus;
  monthly_fee: number | null;
  kit: Kit & { ready: number };
  files: KitFile[];
  designers: { id: string; full_name: string }[];
};

export async function getStudioClient(
  id: string,
): Promise<StudioClient | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select("id, name, industry, status, monthly_fee")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const [{ data: kit }, { data: files }, { data: designers }] =
    await Promise.all([
      supabase
        .from("brand_kits")
        .select(
          "status, colors, heading_font, body_font, voice, guide_checks, signed_off_by, signed_off_at, assigned_designer_id",
        )
        .eq("client_id", id)
        .single(),
      supabase
        .from("brand_kit_files")
        .select("id, slot, file_name, size_bytes, mime_type, storage_path")
        .eq("client_id", id)
        .order("created_at"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["designer", "creative_director"])
        .eq("active", true)
        .order("full_name"),
    ]);
  const list = files ?? [];
  const { data: signed } = list.length
    ? await supabase.storage.from("brand-kits").createSignedUrls(
        list.map((f) => f.storage_path),
        SIGNED_URL_SECONDS,
      )
    : { data: [] };
  const colors = (kit?.colors ?? {}) as Record<string, string>;
  return {
    ...c,
    kit: {
      ...(kit as Omit<Kit, "colors" | "guide_checks">),
      colors,
      guide_checks: (kit?.guide_checks ?? {}) as Record<string, boolean>,
      ready: kitProgress(
        colors,
        list.map((f) => f.slot),
      ),
    },
    files: list.map((f, i) => ({ ...f, url: signed?.[i]?.signedUrl ?? null })),
    designers: designers ?? [],
  };
}

export async function getBriefForStudio(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_briefs")
    .select("answers, uploads, submitted_at, design_notes")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data)
    return { answers: [], uploads: [], submitted_at: null, design_notes: null };
  const raw = (data.uploads ?? []) as {
    path: string;
    note?: string;
    question?: string;
    section?: string;
  }[];
  const { data: signed } = raw.length
    ? await supabase.storage.from("briefs").createSignedUrls(
        raw.map((u) => u.path),
        SIGNED_URL_SECONDS,
      )
    : { data: [] };
  return {
    answers: (data.answers ?? []) as {
      section: string;
      question: string;
      answer: string;
    }[],
    uploads: raw.map((u, i) => ({ ...u, url: signed?.[i]?.signedUrl ?? null })),
    submitted_at: data.submitted_at,
    design_notes: data.design_notes,
  };
}

export type BoardItem = {
  id: string;
  slot_code: string;
  format: string;
  scheduled_date: string | null;
  pillar: string;
  platform: string;
  topic: string | null;
  notes: string | null;
  status: WorkStatus;
  visual: string | null;
  graphic_copy: string | null;
  caption: string | null;
  hashtags: string | null;
  final_file_path: string | null;
  preview_path: string | null;
  finalUrl: string | null;
  previewUrl: string | null;
  revision_rounds: number;
  suggested_fields: string[];
  assigned_designer_id: string | null;
  minutes: number;
  comments: {
    id: string;
    body: string;
    author_kind: string;
    visible_to_client: boolean;
    created_at: string;
    author: string | null;
  }[];
};

export type BoardMonth = {
  id: string;
  plan_status: PlanStatus;
  items: BoardItem[];
};

export async function getBoardMonth(
  clientId: string,
  month: string,
): Promise<BoardMonth | null> {
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("content_months")
    .select(
      "id, plan_status, content_items(id, slot_code, format, scheduled_date, pillar, platform, topic, notes, status, visual, graphic_copy, caption, hashtags, final_file_path, preview_path, revision_rounds, suggested_fields, assigned_designer_id)",
    )
    .eq("client_id", clientId)
    .eq("month", month)
    .maybeSingle();
  if (!m) return null;
  const items = m.content_items;
  const ids = items.map((i) => i.id);
  const [{ data: comments }, { data: time }, { data: people }] =
    await Promise.all([
      ids.length
        ? supabase
            .from("comments")
            .select(
              "id, entity_id, body, author_kind, visible_to_client, created_at, author_id",
            )
            .eq("entity_type", "content_item")
            .in("entity_id", ids)
            .order("created_at")
        : Promise.resolve({ data: [] as never[] }),
      supabase.rpc("client_time", { p_client_id: clientId, p_month: month }),
      supabase.from("profiles").select("id, full_name"),
    ]);
  const paths = items
    .flatMap((i) => [i.final_file_path, i.preview_path])
    .filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage
        .from("content")
        .createSignedUrls(paths, SIGNED_URL_SECONDS)
    : { data: [] };
  const urlFor = (p: string | null) =>
    p ? (signed?.find((s) => s.path === p)?.signedUrl ?? null) : null;
  const nameOf = (id: string) =>
    people?.find((p) => p.id === id)?.full_name ?? null;

  return {
    id: m.id,
    plan_status: m.plan_status,
    items: items
      .map((i) => ({
        ...i,
        finalUrl: urlFor(i.final_file_path),
        previewUrl: urlFor(i.preview_path),
        minutes: (time ?? [])
          .filter((t) => t.content_item_id === i.id)
          .reduce((a, t) => a + Number(t.minutes), 0),
        comments: (comments ?? [])
          .filter((c) => c.entity_id === i.id)
          .map((c) => ({
            id: c.id,
            body: c.body,
            author_kind: c.author_kind,
            visible_to_client: c.visible_to_client,
            created_at: c.created_at,
            author: c.author_kind === "client" ? "Client" : nameOf(c.author_id),
          })),
      }))
      .sort(
        (a, b) =>
          (a.scheduled_date ?? "9").localeCompare(b.scheduled_date ?? "9") ||
          a.slot_code.localeCompare(b.slot_code),
      ),
  };
}

export type RunningTimer = {
  id: string;
  item_id: string | null;
  started_at: string;
  last_activity_at: string | null;
  client_id: string;
  client_name: string;
  label: string;
  link: string;
};

export async function getRunningTimer(): Promise<RunningTimer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: t } = await supabase
    .from("time_entries")
    .select(
      "id, started_at, last_activity_at, client_id, is_brand_kit, content_item_id, client:clients(name), item:content_items(slot_code, topic, month:content_months(month))",
    )
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();
  if (!t) return null;
  const month = t.item?.month?.month?.slice(0, 7);
  return {
    id: t.id,
    item_id: t.content_item_id,
    started_at: t.started_at,
    last_activity_at: t.last_activity_at,
    client_id: t.client_id,
    client_name: t.client?.name ?? "",
    label: t.is_brand_kit
      ? "Brand kit"
      : `${t.item?.slot_code ?? ""}${t.item?.topic ? ` · ${t.item.topic}` : ""}`,
    link: t.is_brand_kit
      ? `/creative/clients/${t.client_id}/kit`
      : `/creative/clients/${t.client_id}/board?month=${month}`,
  };
}

export async function reviewQueue() {
  const supabase = await createClient();
  const [{ data: items }, { data: kits }] = await Promise.all([
    supabase
      .from("content_items")
      .select(
        "id, slot_code, format, topic, scheduled_date, updated_at, client:clients(id, name), month:content_months(month)",
      )
      .eq("status", "internal_review")
      .order("updated_at"),
    supabase
      .from("brand_kits")
      .select("client_id, updated_at, client:clients(name)")
      .eq("status", "internal_review")
      .order("updated_at"),
  ]);
  return {
    items: (items ?? []).map((i) => ({
      ...i,
      clientId: i.client?.id ?? "",
      clientName: i.client?.name ?? "",
      month: i.month?.month ?? "",
    })),
    kits: (kits ?? []).map((k) => ({
      clientId: k.client_id,
      clientName: k.client?.name ?? "",
      since: k.updated_at,
    })),
  };
}

export type ClientTimeRow = {
  content_item_id: string | null;
  is_brand_kit: boolean;
  user_id: string;
  minutes: number;
  manual_minutes: number;
};

export async function clientTime(
  clientId: string,
  month: string,
): Promise<ClientTimeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("client_time", {
    p_client_id: clientId,
    p_month: month,
  });
  return (data ?? []).map((r) => ({
    ...r,
    minutes: Number(r.minutes),
    manual_minutes: Number(r.manual_minutes),
  }));
}

export async function teamTime(month: string) {
  const supabase = await createClient();
  const [{ data: rows }, { data: people }, { data: clients }] =
    await Promise.all([
      supabase.rpc("team_time", { p_month: month }),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("clients").select("id, name, monthly_fee"),
    ]);
  return (rows ?? []).map((r) => ({
    user: people?.find((p) => p.id === r.user_id)?.full_name ?? "Someone",
    userId: r.user_id,
    clientId: r.client_id,
    client: clients?.find((c) => c.id === r.client_id)?.name ?? "",
    fee: clients?.find((c) => c.id === r.client_id)?.monthly_fee ?? null,
    minutes: Number(r.minutes),
  }));
}

export async function listInspiration() {
  const supabase = await createClient();
  const [{ data: rows }, { data: clients }] = await Promise.all([
    supabase
      .from("inspiration")
      .select(
        "id, storage_path, note, tags, client_id, uploaded_by, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("clients")
      .select("id, name")
      .neq("status", "ended")
      .order("name"),
  ]);
  const list = rows ?? [];
  const { data: signed } = list.length
    ? await supabase.storage.from("inspiration").createSignedUrls(
        list.map((r) => r.storage_path),
        SIGNED_URL_SECONDS,
      )
    : { data: [] };
  return {
    items: list.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? null })),
    clients: clients ?? [],
  };
}

/** Whole minutes a running timer has run so far, counted the way the database counts them. */
export function minutesSince(iso: string): number {
  return Math.ceil((Date.now() - Date.parse(iso)) / 60_000);
}

export type LibraryFont = {
  id: string;
  family: string;
  weight: number;
  italic: boolean;
  file_name: string;
  licence_note: string | null;
  url: string | null;
};

export type LibraryPairing = {
  id: string;
  heading_family: string;
  body_family: string;
  style: string;
  good_for: string | null;
};

/** The shared font library: uploaded fonts (with short-lived links) and pairings. */
export async function getFontLibrary(): Promise<{
  fonts: LibraryFont[];
  pairings: LibraryPairing[];
}> {
  const supabase = await createClient();
  const [{ data: fonts }, { data: pairings }] = await Promise.all([
    supabase
      .from("library_fonts")
      .select(
        "id, family, weight, italic, file_name, licence_note, storage_path",
      )
      .order("family")
      .order("weight")
      .order("italic"),
    supabase
      .from("library_pairings")
      .select("id, heading_family, body_family, style, good_for")
      .order("created_at"),
  ]);
  const list = fonts ?? [];
  const { data: signed } = list.length
    ? await supabase.storage.from("fonts").createSignedUrls(
        list.map((f) => f.storage_path),
        SIGNED_URL_SECONDS,
      )
    : { data: [] };
  return {
    fonts: list.map(({ storage_path, ...f }, i) => ({
      ...f,
      url: signed?.[i]?.path === storage_path ? signed[i].signedUrl : null,
    })),
    pairings: pairings ?? [],
  };
}
