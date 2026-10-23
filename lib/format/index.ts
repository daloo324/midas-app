// Display formats from CLAUDE.md: pula as P3,250.00, dates in Africa/Gaborone.

export const TIME_ZONE = "Africa/Gaborone";

const moneyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 3250 or "3250.00" -> "P3,250.00". Empty values show as an em dash. */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  const text = moneyFormat.format(Math.abs(n));
  return n < 0 ? `-P${text}` : `P${text}`;
}

/** A calendar date stored as `date` ("2026-11-01") -> "1 Nov 2026". No time-zone shift. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** A timestamptz -> "23 Oct 2026, 09:15" in Gaborone time. */
export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** Today's date in Gaborone as "YYYY-MM-DD". */
export function todayInGaborone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}
