import { describe, expect, it } from "vitest";
import {
  checkDue,
  monthLabel,
  monthStart,
  shiftMonth,
} from "@/lib/content/constants";
import { checklist, monthStats, type PlanItem } from "@/lib/content/month";

function items(): PlanItem[] {
  const out: PlanItem[] = [];
  for (let i = 1; i <= 20; i++)
    out.push({
      id: `p${i}`,
      slot_code: `P${String(i).padStart(2, "0")}`,
      format: "post",
      scheduled_date: `2026-11-${String(i + 1).padStart(2, "0")}`,
      pillar: i <= 6 ? "showcase" : "educate",
      topic: "T",
      status: "planned",
    });
  for (let i = 1; i <= 4; i++)
    out.push({
      id: `s${i}`,
      slot_code: `S0${i}`,
      format: "story",
      scheduled_date: "2026-11-10",
      pillar: "engage",
      topic: "T",
      status: "planned",
    });
  for (let i = 1; i <= 2; i++)
    out.push({
      id: `r${i}`,
      slot_code: `R0${i}`,
      format: "reel",
      scheduled_date: "2026-11-11",
      pillar: "educate",
      topic: "T",
      status: "planned",
    });
  return out;
}

describe("months", () => {
  it("reads and shifts months", () => {
    expect(monthStart("2026-11")).toBe("2026-11-01");
    expect(monthStart("2026-13")).toBeNull();
    expect(monthStart("nope")).toBeNull();
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(monthLabel("2026-11-01")).toBe("November 2026");
  });

  it("works out each step's due date", () => {
    expect(checkDue("calendar_drafted", "2026-11-01", null)).toBe("2026-10-20");
    expect(checkDue("calendar_approved", "2026-11-01", null)).toBe(
      "2026-10-25",
    );
    expect(checkDue("weeks_1_2", "2026-11-01", null)).toBe("2026-10-31");
    expect(checkDue("weeks_3_4", "2026-11-01", null)).toBe("2026-11-14");
    expect(checkDue("report_sent", "2026-12-01", null)).toBe("2027-01-03");
    expect(checkDue("campaign_live", "2026-11-01", "2026-11-10")).toBe(
      "2026-11-10",
    );
    expect(checkDue("campaign_live", "2026-11-01", null)).toBeNull();
  });
});

describe("monthStats", () => {
  it("counts the 26 slots, not the ads", () => {
    const list = items();
    list[0].status = "published";
    list[1].status = "client_review";
    list.push({
      id: "a1",
      slot_code: "A01",
      format: "ad_feed",
      scheduled_date: null,
      pillar: "campaign",
      topic: "Feed ad",
      status: "planned",
    });
    const s = monthStats(list, "2026-11-04");
    expect(s.total).toBe(26);
    expect(s.published).toBe(1);
    expect(s.waitingOnClient).toBe(1);
    expect(s.byPillar.showcase).toBe(6);
    expect(s.next?.slot_code).toBe("P03"); // P01 published; P02's date (3 Nov) has passed
  });
});

describe("checklist", () => {
  const base = {
    month: "2026-11-01",
    planStatus: "draft" as const,
    campaign: null,
    reviewPublishedAt: null,
    manual: {},
  };

  it("ticks steps from the records", () => {
    const steps = checklist(
      {
        ...base,
        items: items(),
        planStatus: "approved",
        campaign: { status: "live", start_date: "2026-11-10" },
      },
      "2026-11-02",
    );
    const done = Object.fromEntries(steps.map((s) => [s.key, s.done]));
    expect(done).toMatchObject({
      calendar_drafted: true,
      calendar_approved: true,
      brief_approved: true,
      campaign_live: true,
      report_sent: false,
    });
  });

  it("a slot without a topic means the calendar isn't drafted", () => {
    const list = items();
    list[5].topic = "  ";
    expect(
      checklist({ ...base, items: list }, "2026-10-01").find(
        (s) => s.key === "calendar_drafted",
      )!.done,
    ).toBe(false);
  });

  it("hand-ticked steps follow the saved ticks, and late steps are overdue", () => {
    const steps = checklist(
      { ...base, items: items(), manual: { weeks_1_2: true } },
      "2026-11-15",
    );
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));
    expect(byKey.weeks_1_2.done).toBe(true);
    expect(byKey.weeks_3_4.overdue).toBe(true);
    expect(byKey.calendar_approved.overdue).toBe(true);
    expect(byKey.report_sent.overdue).toBe(false);
    expect(byKey.campaign_live.overdue).toBe(false); // no campaign date yet
  });
});
