import type { ItemFormat, WorkStatus } from "@/lib/content/constants";

// The words the client sees (client-portal.html), not the studio's.

export const CLIENT_STATUS: Partial<
  Record<WorkStatus, { label: string; pill: string; color: string }>
> = {
  client_review: {
    label: "Waiting for you",
    pill: "s-warn",
    color: "var(--warn)",
  },
  changes_requested: {
    label: "Changes requested",
    pill: "s-bad",
    color: "var(--bad)",
  },
  approved: { label: "Approved", pill: "s-good", color: "var(--gold-ink)" },
  scheduled: { label: "Scheduled", pill: "s-gold", color: "var(--gold)" },
  published: { label: "Published", pill: "s-good", color: "var(--good)" },
};

export const CLIENT_STATUS_ORDER: WorkStatus[] = [
  "published",
  "scheduled",
  "approved",
  "client_review",
  "changes_requested",
];

export const FORMAT_LABEL: Record<ItemFormat, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  ad_feed: "Feed ad",
  ad_story: "Story ad",
  ad_variant: "Test ad",
};

export function longDay(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
