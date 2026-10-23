// Shared words, colours and rules for content, campaigns and KPIs, taken from
// docs/prototypes/account-desk.html and docs/spec/03-accounts.md. Safe to use
// in client components.

import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type WorkStatus = Enums["work_status"];
export type Pillar = Enums["pillar"];
export type ItemFormat = Enums["item_format"];
export type PlanStatus = Enums["plan_status"];
export type CampaignStatus = Enums["campaign_status"];
export type GoalCategory = Enums["goal_category"];

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------

export const WORK_STATUSES: WorkStatus[] = [
  "planned",
  "in_design",
  "internal_review",
  "client_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  planned: "Planned",
  in_design: "In design",
  internal_review: "Internal review",
  client_review: "Client review",
  changes_requested: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
};

/** Bar colours, from the prototype's ST_COLOR (two statuses added for the spec's flow). */
export const WORK_STATUS_COLOR: Record<WorkStatus, string> = {
  planned: "var(--line)",
  in_design: "var(--info)",
  internal_review: "var(--navy-2)",
  client_review: "var(--warn)",
  changes_requested: "var(--bad)",
  approved: "var(--gold)",
  scheduled: "var(--gold-ink)",
  published: "var(--good)",
};

export const WORK_STATUS_PILL: Record<WorkStatus, string> = {
  planned: "",
  in_design: "s-info",
  internal_review: "s-info",
  client_review: "s-warn",
  changes_requested: "s-bad",
  approved: "s-gold",
  scheduled: "s-gold",
  published: "s-good",
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Draft",
  sent: "Sent to client",
  approved: "Approved by client",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  sent: "Sent to client",
  approved: "Approved",
  live: "Live",
  complete: "Complete",
};

export const CAMPAIGN_STATUS_PILL: Record<CampaignStatus, string> = {
  draft: "",
  sent: "s-warn",
  approved: "s-gold",
  live: "s-info",
  complete: "s-good",
};

// ---------------------------------------------------------------------------
// Pillars and formats
// ---------------------------------------------------------------------------

export const POST_PILLARS: Exclude<Pillar, "campaign">[] = [
  "showcase",
  "educate",
  "proof",
  "behind_the_scenes",
  "engage",
];

export const PILLAR_LABELS: Record<Pillar, string> = {
  showcase: "Showcase",
  educate: "Educate",
  proof: "Proof",
  behind_the_scenes: "Behind the scenes",
  engage: "Engage",
  campaign: "Campaign",
};

export const PILLAR_HINT: Record<Exclude<Pillar, "campaign">, string> = {
  showcase: "Products, services, offers",
  educate: "Tips, how-tos, myths vs facts",
  proof: "Reviews, results, before & after",
  behind_the_scenes: "Team, process, workspace",
  engage: "Questions, polls, events, trends",
};

export const DEFAULT_MIX: Record<Exclude<Pillar, "campaign">, number> = {
  showcase: 6,
  educate: 5,
  proof: 3,
  behind_the_scenes: 3,
  engage: 3,
};

export const FORMAT_GROUPS: { format: ItemFormat; label: string }[] = [
  { format: "post", label: "Posts" },
  { format: "story", label: "Stories" },
  { format: "reel", label: "Reels" },
];

export const ITEM_PLATFORMS = [
  "both",
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "x",
  "youtube",
] as const;
export type ItemPlatform = (typeof ITEM_PLATFORMS)[number];
export const ITEM_PLATFORM_LABELS: Record<ItemPlatform, string> = {
  both: "Both",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
};

// ---------------------------------------------------------------------------
// What the client expects (prototype EXPECT)
// ---------------------------------------------------------------------------

export const EXPECTATIONS: {
  key: GoalCategory;
  label: string;
  d: string;
  covered: boolean;
}[] = [
  {
    key: "visibility",
    label: "Visibility",
    d: "Be seen regularly by more people",
    covered: true,
  },
  {
    key: "credibility",
    label: "Credibility",
    d: "Look established and trustworthy",
    covered: true,
  },
  {
    key: "engagement",
    label: "Engagement",
    d: "People react, comment, message, follow",
    covered: true,
  },
  {
    key: "results",
    label: "Results",
    d: "Enquiries, bookings, sales",
    covered: false,
  },
];

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

/** "2026-11" or "2026-11-01" -> "2026-11-01"; null if it isn't a month. */
export function monthStart(value: string | null | undefined): string | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(value ?? "");
  return m ? `${m[1]}-${m[2]}-01` : null;
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 10);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** For URLs: "2026-11-01" -> "2026-11". */
export const monthParam = (month: string) => month.slice(0, 7);

export function dayLabel(date: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function onDay(month: string, day: number): string {
  return `${month.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Month checklist (03-accounts.md, "Month plan")
// ---------------------------------------------------------------------------

export type CheckKey =
  | "review_sent"
  | "calendar_drafted"
  | "calendar_approved"
  | "brief_approved"
  | "weeks_1_2"
  | "weeks_3_4"
  | "campaign_live"
  | "report_sent";

export const MANUAL_CHECKS: CheckKey[] = [
  "review_sent",
  "weeks_1_2",
  "weeks_3_4",
];

export const CHECKS: { key: CheckKey; label: string; when: string }[] = [
  {
    key: "review_sent",
    label: "Last month's review published, next month's focus agreed",
    when: "By day 3",
  },
  {
    key: "calendar_drafted",
    label: "Calendar drafted (all 26 slots have a topic)",
    when: "By day 20 of the month before",
  },
  {
    key: "calendar_approved",
    label: "Client approved the calendar",
    when: "By day 25 of the month before",
  },
  {
    key: "brief_approved",
    label: "Client approved the campaign brief",
    when: "By day 25 of the month before",
  },
  {
    key: "weeks_1_2",
    label: "Weeks 1–2 content approved and scheduled",
    when: "Before day 1",
  },
  {
    key: "weeks_3_4",
    label: "Weeks 3–4 content approved and scheduled",
    when: "By day 14",
  },
  {
    key: "campaign_live",
    label: "Campaign live",
    when: "On the campaign start date",
  },
  {
    key: "report_sent",
    label: "Monthly review published to the client",
    when: "By day 3 of next month",
  },
];

/** The last day a step can be done without being late, or null if there's no date yet. */
export function checkDue(
  key: CheckKey,
  month: string,
  campaignStart: string | null,
): string | null {
  const before = shiftMonth(month, -1);
  switch (key) {
    case "review_sent":
      return onDay(month, 3);
    case "calendar_drafted":
      return onDay(before, 20);
    case "calendar_approved":
    case "brief_approved":
      return onDay(before, 25);
    case "weeks_1_2": {
      const d = new Date(`${month}T00:00:00Z`);
      d.setUTCDate(0); // the day before the 1st
      return d.toISOString().slice(0, 10);
    }
    case "weeks_3_4":
      return onDay(month, 14);
    case "campaign_live":
      return campaignStart;
    case "report_sent":
      return onDay(shiftMonth(month, 1), 3);
  }
}

// ---------------------------------------------------------------------------
// KPIs (prototype KPI), with where each number comes from
// ---------------------------------------------------------------------------

export type KpiKey =
  | "reach"
  | "views"
  | "followers"
  | "profile_visits"
  | "saves"
  | "reviews"
  | "first_round_approved"
  | "interactions"
  | "comments"
  | "shares"
  | "reel_plays"
  | "link_clicks"
  | "messages"
  | "ad_spend"
  | "ad_results"
  | "enquiries";

export type CalcKey =
  | "net_new_followers"
  | "consistency"
  | "first_round_rate"
  | "engagement_rate"
  | "cost_per_result";

export type KpiRow =
  | { key: KpiKey; label: string; money?: boolean }
  | { calc: CalcKey; label: string };

export const KPI_CATEGORIES: {
  key: GoalCategory;
  label: string;
  question: string;
  rows: KpiRow[];
}[] = [
  {
    key: "visibility",
    label: "Visibility",
    question: "Are more people seeing the brand?",
    rows: [
      { key: "reach", label: "Accounts reached" },
      { key: "views", label: "Views / impressions" },
      { key: "followers", label: "Total followers at month end" },
      { calc: "net_new_followers", label: "Net new followers" },
      { calc: "consistency", label: "Published vs planned (26)" },
    ],
  },
  {
    key: "credibility",
    label: "Credibility",
    question: "Does the brand look established and trustworthy?",
    rows: [
      { key: "profile_visits", label: "Profile visits" },
      { key: "saves", label: "Saves" },
      { key: "reviews", label: "New reviews or positive mentions" },
      { key: "first_round_approved", label: "Pieces approved without changes" },
      { calc: "first_round_rate", label: "First-round approval rate" },
    ],
  },
  {
    key: "engagement",
    label: "Engagement",
    question: "Are people reacting and talking back?",
    rows: [
      {
        key: "interactions",
        label: "Interactions (likes, comments, shares, saves)",
      },
      {
        calc: "engagement_rate",
        label: "Engagement rate (interactions ÷ reach)",
      },
      { key: "comments", label: "Comments" },
      { key: "shares", label: "Shares" },
      { key: "reel_plays", label: "Reel plays" },
    ],
  },
  {
    key: "results",
    label: "Results",
    question: "Is it bringing in business? Partly outside our control.",
    rows: [
      { key: "link_clicks", label: "Link clicks" },
      { key: "messages", label: "Messages / WhatsApp chats started" },
      { key: "ad_spend", label: "Ad spend (P)", money: true },
      { key: "ad_results", label: "Ad results (by campaign goal)" },
      { calc: "cost_per_result", label: "Cost per ad result" },
      { key: "enquiries", label: "Enquiries reported by client" },
    ],
  },
];

export const KPI_KEYS: KpiKey[] = KPI_CATEGORIES.flatMap((c) =>
  c.rows.flatMap((r) => ("key" in r ? [r.key] : [])),
);

export const METRIC_SOURCE_LABELS = {
  manual: "Manual",
  meta: "Meta",
  ga4: "GA4",
} as const;

export const BASELINE_FIELDS = [
  { key: "followers", label: "Followers" },
  { key: "reach", label: "Monthly reach" },
  { key: "interactions", label: "Monthly interactions" },
  { key: "profile_visits", label: "Profile visits" },
  { key: "messages", label: "Messages a month" },
] as const;
export type BaselineKey = (typeof BASELINE_FIELDS)[number]["key"];

// ---------------------------------------------------------------------------
// Campaign brief: five parts (prototype PARTS, mapped to the campaigns table)
// ---------------------------------------------------------------------------

export type CampaignFieldKey =
  | "name"
  | "goal"
  | "main_kpi"
  | "offer"
  | "start_date"
  | "end_date"
  | "ad_budget"
  | "ads_run_by"
  | "audience.location"
  | "audience.age"
  | "audience.interests"
  | "audience.retarget"
  | "message.hook"
  | "message.headline_a"
  | "message.headline_b"
  | "message.primary_text"
  | "message.cta"
  | "message.test_angle"
  | "creative_direction"
  | "launch.landing"
  | "launch.tracking"
  | "launch.replier"
  | "launch.reply_time"
  | "results";

export type CampaignField = {
  key: CampaignFieldKey;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
  full?: boolean;
};

const opts = (...values: string[]) =>
  values.map((v) => ({ value: v, label: v }));

export const CAMPAIGN_PARTS: {
  key: string;
  title: string;
  d: string;
  deliverable: string;
  fields: CampaignField[];
  ads?: boolean;
}[] = [
  {
    key: "objective",
    title: "Objective and offer",
    d: "What the campaign must achieve, and the offer that gets people to act.",
    deliverable: "One-page brief, signed off by the client",
    fields: [
      {
        key: "goal",
        label: "Goal",
        type: "select",
        options: opts(
          "Awareness",
          "Messages / WhatsApp chats",
          "Leads",
          "Website traffic",
          "Sales",
          "Event sign-ups",
        ),
      },
      {
        key: "main_kpi",
        label: "Main KPI",
        type: "text",
        placeholder: "e.g. 60 WhatsApp chats",
      },
      {
        key: "offer",
        label: "Offer",
        type: "text",
        placeholder: "e.g. 20% off first order this weekend",
        full: true,
      },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      {
        key: "ad_budget",
        label: "Ad budget (P, paid by the client to Meta)",
        type: "number",
      },
      {
        key: "ads_run_by",
        label: "Who runs the ads",
        type: "select",
        options: [
          { value: "midas", label: "Midas runs ads in Meta Ads Manager" },
          {
            value: "client",
            label: "Client runs ads, Midas supplies creative",
          },
        ],
      },
    ],
  },
  {
    key: "audience",
    title: "Audience",
    d: "Who should see the ads.",
    deliverable: "Audience profile and targeting settings",
    fields: [
      {
        key: "audience.location",
        label: "Location and radius",
        type: "text",
        placeholder: "e.g. Gaborone + 25 km",
      },
      {
        key: "audience.age",
        label: "Age range",
        type: "text",
        placeholder: "e.g. 25–45",
      },
      {
        key: "audience.interests",
        label: "Interests and behaviours",
        type: "textarea",
        full: true,
      },
      {
        key: "audience.retarget",
        label: "Retarget existing followers or past customers?",
        type: "select",
        options: opts("Yes", "No"),
        full: true,
      },
    ],
  },
  {
    key: "message",
    title: "Message and copy",
    d: "What the ad says, and the one action it asks for.",
    deliverable: "Copy sheet with 2 headline and text variations",
    fields: [
      {
        key: "message.hook",
        label: "Hook (first line)",
        type: "text",
        full: true,
      },
      { key: "message.headline_a", label: "Headline A", type: "text" },
      { key: "message.headline_b", label: "Headline B", type: "text" },
      {
        key: "message.primary_text",
        label: "Main ad text",
        type: "textarea",
        full: true,
      },
      {
        key: "message.cta",
        label: "Call to action",
        type: "select",
        options: opts(
          "Send message",
          "Learn more",
          "Book now",
          "Shop now",
          "Sign up",
          "Call now",
        ),
      },
      {
        key: "message.test_angle",
        label: "Alternative angle to test",
        type: "text",
      },
    ],
  },
  {
    key: "creative",
    title: "Creative",
    d: "Ad artwork built from the brand kit.",
    deliverable: "Feed ad 4:5, story or reel ad 9:16, one test variant",
    ads: true,
    fields: [
      {
        key: "creative_direction",
        label: "Visual direction",
        type: "textarea",
        full: true,
        placeholder: "Photo or graphic, key visual, offer placement",
      },
    ],
  },
  {
    key: "launch",
    title: "Launch and reporting",
    d: "Where people land, how results are tracked and when they're reported.",
    deliverable: "Launch checklist and a results summary in the monthly review",
    fields: [
      {
        key: "launch.landing",
        label: "Where people land",
        type: "select",
        options: opts(
          "WhatsApp chat",
          "Instagram / Facebook DM",
          "Website",
          "Lead form",
          "Phone call",
        ),
      },
      {
        key: "launch.tracking",
        label: "How results are tracked",
        type: "text",
        placeholder: "e.g. Ads Manager results + client's enquiry count",
      },
      {
        key: "launch.replier",
        label: "Who answers incoming messages (client side)",
        type: "text",
      },
      {
        key: "launch.reply_time",
        label: "Agreed reply time",
        type: "text",
        placeholder: "e.g. within 1 hour, 8am–6pm",
      },
      {
        key: "results",
        label: "Results summary",
        type: "textarea",
        full: true,
        placeholder: "Fill in at the end of the campaign",
      },
    ],
  },
];

export const AD_SLOTS = [
  { slot: "A01", label: "Feed ad · 4:5" },
  { slot: "A02", label: "Story / reel ad · 9:16" },
  { slot: "A03", label: "Test variant" },
] as const;

/** The checks before a campaign goes live (03-accounts.md, "Campaign brief"). */
export const LAUNCH_CHECKS = [
  "The offer is real and in stock",
  "Someone answers messages within the agreed time",
  "The landing link works",
];
