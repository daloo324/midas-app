import "server-only";
import {
  checkDue,
  type CampaignStatus,
  type ItemFormat,
  type Pillar,
} from "@/lib/content/constants";
import { createClient } from "@/lib/supabase/server";

// What a signed-in client is waiting to approve. Reads only the portal views,
// which show a client their own sent work and nothing else.

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

export type Approval = CalendarApproval | BriefApproval;

export async function listApprovals(): Promise<Approval[]> {
  const supabase = await createClient();
  const [{ data: months }, { data: briefs }] = await Promise.all([
    supabase
      .from("portal_months")
      .select("id, month")
      .eq("plan_status", "sent"),
    supabase
      .from("portal_campaigns")
      .select(
        "id, month, status, name, goal, offer, start_date, end_date, ad_budget, audience, message",
      )
      .eq("status", "sent"),
  ]);
  const ids = (months ?? []).map((m) => m.id!);
  const { data: rows } = ids.length
    ? await supabase
        .from("portal_calendar")
        .select("month_id, slot_code, format, scheduled_date, pillar, topic")
        .in("month_id", ids)
        .order("scheduled_date")
    : { data: [] };

  const list: Approval[] = [
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
  ];
  return list.sort((a, b) => a.due.localeCompare(b.due));
}

export async function countApprovals(): Promise<number> {
  const supabase = await createClient();
  const [{ count: months }, { count: briefs }] = await Promise.all([
    supabase
      .from("portal_months")
      .select("id", { count: "exact", head: true })
      .eq("plan_status", "sent"),
    supabase
      .from("portal_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
  ]);
  return (months ?? 0) + (briefs ?? 0);
}

export type PublishedReview = {
  month: string;
  published_at: string;
  working: string | null;
  adjust: string | null;
  top_piece: string | null;
  focus: string | null;
};

/** Reviews the client can see: only published ones (the view hides the rest). */
export async function listPublishedReviews(): Promise<PublishedReview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_months")
    .select("month, review, review_published_at")
    .not("review_published_at", "is", null)
    .order("month", { ascending: false });
  return (data ?? []).map((m) => {
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
}
