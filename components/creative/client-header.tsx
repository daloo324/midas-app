import Link from "next/link";
import { monthLabel, monthParam, shiftMonth } from "@/lib/content/constants";

export type StudioTab = "brief" | "kit" | "board" | "time";

const TABS: { key: StudioTab; label: string; monthly: boolean }[] = [
  { key: "brief", label: "1 · Brand brief", monthly: false },
  { key: "kit", label: "2 · Brand kit", monthly: false },
  { key: "board", label: "3 · Weekly board", monthly: true },
  { key: "time", label: "Time report", monthly: true },
];

/** Crumbs, name, month picker (board and time) and tabs (design-studio.html, client view). */
export function StudioHeader({
  client,
  tab,
  month,
  sub,
}: {
  client: { id: string; name: string; industry: string | null };
  tab: StudioTab;
  month?: string;
  sub?: string;
}) {
  const base = `/creative/clients/${client.id}`;
  const q = (m: string) => `?month=${monthParam(m)}`;
  return (
    <>
      <div className="crumbs">
        <Link className="link" href="/creative">
          All clients
        </Link>{" "}
        / {client.name}
      </div>
      <div className="head" style={{ marginBottom: 14 }}>
        <div>
          <h1>{client.name}</h1>
          <p className="sub">{sub ?? client.industry ?? ""}</p>
        </div>
        {month && TABS.find((t) => t.key === tab)!.monthly ? (
          <div className="month-pick">
            <Link
              href={`${base}/${tab}${q(shiftMonth(month, -1))}`}
              aria-label="Previous month"
            >
              ‹
            </Link>
            <b>{monthLabel(month)}</b>
            <Link
              href={`${base}/${tab}${q(shiftMonth(month, 1))}`}
              aria-label="Next month"
            >
              ›
            </Link>
          </div>
        ) : null}
      </div>
      <nav className="tabs" aria-label="Client">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`${base}/${t.key}${t.monthly && month ? q(month) : ""}`}
            aria-current={t.key === tab ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
