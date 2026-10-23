// Monday-to-Sunday weeks covering a month (04-creative.md, "Week strip").

export type Week = { index: number; start: string; end: string };

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weeksOfMonth(month: string): Week[] {
  const first = `${month.slice(0, 7)}-01`;
  const [y, m] = first.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const weeks: Week[] = [];
  for (
    let start = addDays(first, -weekday), i = 0;
    start <= last;
    start = addDays(start, 7), i++
  ) {
    weeks.push({ index: i, start, end: addDays(start, 6) });
  }
  return weeks;
}

/** The week to open on: ?week=N if valid, else the week containing today, else the first. */
export function pickWeek(
  weeks: Week[],
  param: string | undefined,
  today: string,
): number {
  const n = Number(param);
  if (Number.isInteger(n) && n >= 0 && n < weeks.length) return n;
  const current = weeks.findIndex((w) => today >= w.start && today <= w.end);
  return current >= 0 ? current : 0;
}
