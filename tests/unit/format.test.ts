import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatDay,
  formatMoney,
  todayInGaborone,
} from "@/lib/format";

describe("formatMoney", () => {
  it("shows pula with two decimals and thousands commas", () => {
    expect(formatMoney(3250)).toBe("P3,250.00");
    expect(formatMoney("3250.00")).toBe("P3,250.00");
    expect(formatMoney(0)).toBe("P0.00");
    expect(formatMoney(1234567.5)).toBe("P1,234,567.50");
    expect(formatMoney(-50)).toBe("-P50.00");
  });

  it("shows a dash when there's no amount", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("")).toBe("—");
    expect(formatMoney("abc")).toBe("—");
  });
});

describe("formatDay", () => {
  it("shows a stored date without shifting it", () => {
    expect(formatDay("2026-11-01")).toBe("1 Nov 2026");
    expect(formatDay("2026-12-31")).toBe("31 Dec 2026");
    expect(formatDay(null)).toBe("—");
  });
});

describe("Gaborone time", () => {
  it("shows timestamps at UTC+2", () => {
    expect(formatDateTime("2026-10-23T22:30:00Z")).toBe("24 Oct 2026, 00:30");
  });

  it("knows today's date in Gaborone", () => {
    expect(todayInGaborone(new Date("2026-10-31T22:30:00Z"))).toBe(
      "2026-11-01",
    );
    expect(todayInGaborone(new Date("2026-10-31T21:30:00Z"))).toBe(
      "2026-10-31",
    );
  });
});
