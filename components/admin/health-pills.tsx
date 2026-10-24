import { formatMoney } from "@/lib/format";
import type { ClientHealth } from "@/lib/data/overview";

// The coloured pills used in the overview's client health and the clients table.

export function ProgressPill({ p }: { p: ClientHealth["progress"] }) {
  if (!p.planned) return <span className="pill">No plan</span>;
  const pct = p.done / p.planned;
  return (
    <span
      className={`pill ${pct >= 0.75 ? "s-good" : pct >= 0.35 ? "s-warn" : "s-bad"}`}
    >
      {p.done} / {p.planned}
    </span>
  );
}

export function TrendPill({ g }: { g: ClientHealth["goal"] }) {
  if (g.trend === "none")
    return <span className="pill">{g.label}: no data</span>;
  const map = {
    up: ["s-good", "up"],
    down: ["s-bad", "down"],
    flat: ["", "flat"],
  } as const;
  const [cls, word] = map[g.trend];
  return (
    <span className={`pill ${cls}`}>
      {g.label} {word}
    </span>
  );
}

export function RatePill({
  rate,
  threshold,
}: {
  rate: number | null;
  threshold: number;
}) {
  if (rate == null) return <span className="pill">No hours yet</span>;
  return (
    <span className={`pill ${rate >= threshold ? "s-good" : "s-bad"}`}>
      {formatMoney(rate)}/h
    </span>
  );
}

export function InvoicePill({
  s,
  balance,
}: {
  s: ClientHealth["invoice"];
  balance: number;
}) {
  if (s === "overdue")
    return <span className="pill s-bad">Overdue {formatMoney(balance)}</span>;
  if (s === "due")
    return <span className="pill s-warn">Due {formatMoney(balance)}</span>;
  if (s === "paid") return <span className="pill s-good">Paid up</span>;
  return <span className="pill">No invoices</span>;
}
