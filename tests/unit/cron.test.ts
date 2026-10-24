import { describe, expect, it } from "vitest";
import { daysBetween, reminderFor, workingDaysBetween } from "@/lib/cron/jobs";

describe("payment reminders", () => {
  it("are due 3 days before, and on the 1st and 7th day overdue", () => {
    expect(reminderFor("2026-11-10", "2026-11-06")).toBeNull();
    expect(reminderFor("2026-11-10", "2026-11-07")).toBe("due_soon");
    expect(reminderFor("2026-11-10", "2026-11-09")).toBe("due_soon");
    expect(reminderFor("2026-11-10", "2026-11-10")).toBeNull();
    expect(reminderFor("2026-11-10", "2026-11-11")).toBe("overdue_1");
    expect(reminderFor("2026-11-10", "2026-11-16")).toBe("overdue_1");
    expect(reminderFor("2026-11-10", "2026-11-17")).toBe("overdue_7");
    expect(reminderFor("2026-11-10", "2027-01-01")).toBe("overdue_7");
  });

  it("count calendar days across month ends", () => {
    expect(daysBetween("2026-11-28", "2026-12-03")).toBe(5);
  });
});

describe("working days", () => {
  it("count Monday to Friday after the start date", () => {
    // Fri 6 Nov 2026 → Tue 10 Nov 2026: Mon and Tue.
    expect(workingDaysBetween("2026-11-06", "2026-11-10")).toBe(2);
    expect(workingDaysBetween("2026-11-06", "2026-11-08")).toBe(0);
    expect(workingDaysBetween("2026-11-09", "2026-11-09")).toBe(0);
  });
});
