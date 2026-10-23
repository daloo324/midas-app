// The month plan's numbers: content stats and the 8-step checklist
// (03-accounts.md, "Month plan"). Pure functions, shared by pages and tests.

import {
  CHECKS,
  MANUAL_CHECKS,
  POST_PILLARS,
  WORK_STATUSES,
  checkDue,
  type CampaignStatus,
  type CheckKey,
  type ItemFormat,
  type Pillar,
  type PlanStatus,
  type WorkStatus,
} from "./constants";

export type PlanItem = {
  id: string;
  slot_code: string;
  format: ItemFormat;
  scheduled_date: string | null;
  pillar: Pillar;
  topic: string | null;
  status: WorkStatus;
};

const isRegular = (i: PlanItem) => !i.slot_code.startsWith("A");

export type MonthStats = {
  total: number;
  byStatus: Record<WorkStatus, number>;
  byPillar: Record<(typeof POST_PILLARS)[number], number>;
  published: number;
  ready: number;
  waitingOnClient: number;
  next: PlanItem | null;
};

/** Counts for the 26 regular slots (ads are counted with the campaign). */
export function monthStats(items: PlanItem[], today: string): MonthStats {
  const regular = items.filter(isRegular);
  const byStatus = Object.fromEntries(
    WORK_STATUSES.map((s) => [s, 0]),
  ) as MonthStats["byStatus"];
  const byPillar = Object.fromEntries(
    POST_PILLARS.map((p) => [p, 0]),
  ) as MonthStats["byPillar"];
  let next: PlanItem | null = null;
  for (const i of regular) {
    byStatus[i.status] += 1;
    if (i.format === "post" && i.pillar !== "campaign") byPillar[i.pillar] += 1;
    if (
      i.status !== "published" &&
      i.scheduled_date &&
      i.scheduled_date >= today &&
      (!next ||
        i.scheduled_date < next.scheduled_date! ||
        (i.scheduled_date === next.scheduled_date &&
          i.slot_code < next.slot_code))
    ) {
      next = i;
    }
  }
  return {
    total: regular.length,
    byStatus,
    byPillar,
    published: byStatus.published,
    ready: byStatus.approved + byStatus.scheduled + byStatus.published,
    waitingOnClient: byStatus.client_review,
    next,
  };
}

export type ChecklistInput = {
  month: string;
  items: PlanItem[];
  planStatus: PlanStatus;
  campaign: { status: CampaignStatus; start_date: string | null } | null;
  reviewPublishedAt: string | null;
  manual: Partial<Record<CheckKey, boolean>>;
};

export type CheckState = {
  key: CheckKey;
  label: string;
  when: string;
  done: boolean;
  manual: boolean;
  due: string | null;
  overdue: boolean;
};

/** Each step, whether it's done (by the records or by hand), and whether it's late. */
export function checklist(input: ChecklistInput, today: string): CheckState[] {
  const regular = input.items.filter(isRegular);
  const camp = input.campaign?.status ?? null;
  const auto: Partial<Record<CheckKey, boolean>> = {
    calendar_drafted:
      regular.length === 26 &&
      regular.every((i) => (i.topic ?? "").trim() !== ""),
    calendar_approved: input.planStatus === "approved",
    brief_approved:
      camp === "approved" || camp === "live" || camp === "complete",
    campaign_live: camp === "live" || camp === "complete",
    report_sent: input.reviewPublishedAt !== null,
  };
  return CHECKS.map((c) => {
    const manual = MANUAL_CHECKS.includes(c.key);
    const done = manual ? Boolean(input.manual[c.key]) : Boolean(auto[c.key]);
    const due = checkDue(
      c.key,
      input.month,
      input.campaign?.start_date ?? null,
    );
    return {
      ...c,
      done,
      manual,
      due,
      overdue: !done && due !== null && today > due,
    };
  });
}
