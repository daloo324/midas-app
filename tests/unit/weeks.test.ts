import { describe, expect, it } from "vitest";
import { pickWeek, weeksOfMonth } from "@/lib/creative/weeks";

describe("weeksOfMonth", () => {
  it("covers the month in Monday-to-Sunday weeks", () => {
    const w = weeksOfMonth("2026-11-01"); // 1 Nov 2026 is a Sunday
    expect(w[0]).toEqual({ index: 0, start: "2026-10-26", end: "2026-11-01" });
    expect(w.at(-1)).toEqual({
      index: 5,
      start: "2026-11-30",
      end: "2026-12-06",
    });
    expect(w).toHaveLength(6);
  });
  it("a month starting on Monday starts there", () => {
    expect(weeksOfMonth("2027-02-01")[0].start).toBe("2027-02-01");
    expect(weeksOfMonth("2027-02-01")).toHaveLength(4);
  });
  it("opens on this week, or the chosen one", () => {
    const w = weeksOfMonth("2026-11-01");
    expect(pickWeek(w, undefined, "2026-11-11")).toBe(2);
    expect(pickWeek(w, "4", "2026-11-11")).toBe(4);
    expect(pickWeek(w, "9", "2026-12-25")).toBe(0);
  });
});
