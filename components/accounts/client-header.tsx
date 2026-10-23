import Link from "next/link";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_PILL } from "@/lib/format/status";
import { PLATFORM_LABELS } from "@/lib/validation/clients";
import { monthLabel, monthParam, shiftMonth } from "@/lib/content/constants";
import type { DeskClient } from "@/lib/data/accounts";

export type Tab =
  "plan" | "calendar" | "campaign" | "kpis" | "profile" | "onboarding";

const TABS: { key: Tab; label: string; path: string; monthly: boolean }[] = [
  { key: "plan", label: "Month plan", path: "", monthly: true },
  {
    key: "calendar",
    label: "Content calendar",
    path: "/calendar",
    monthly: true,
  },
  {
    key: "campaign",
    label: "Campaign brief",
    path: "/campaign",
    monthly: true,
  },
  { key: "kpis", label: "KPIs & review", path: "/kpis", monthly: true },
  { key: "profile", label: "Client profile", path: "/profile", monthly: false },
  {
    key: "onboarding",
    label: "Onboarding",
    path: "/onboarding",
    monthly: false,
  },
];

/** Crumbs, name, month picker and tabs (account-desk.html, client view). */
export function ClientHeader({
  client,
  tab,
  month,
}: {
  client: DeskClient;
  tab: Tab;
  month?: string;
}) {
  const base = `/accounts/clients/${client.id}`;
  const current = TABS.find((t) => t.key === tab)!;
  const q = (m: string) => `?month=${monthParam(m)}`;
  const platforms = client.platforms
    .map((p) => PLATFORM_LABELS[p as keyof typeof PLATFORM_LABELS] ?? p)
    .join(" + ");
  return (
    <>
      <div className="crumbs">
        <Link className="link" href="/accounts">
          All clients
        </Link>{" "}
        / {client.name}
      </div>
      <div className="chead">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1>{client.name}</h1>
            <span className={`pill ${CLIENT_STATUS_PILL[client.status]}`}>
              {CLIENT_STATUS_LABELS[client.status]}
            </span>
          </div>
          <p className="sub">
            {[
              client.industry,
              client.accountExecName && `AE ${client.accountExecName}`,
              platforms,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {current.monthly && month ? (
          <div className="month-pick">
            <Link
              href={`${base}${current.path}${q(shiftMonth(month, -1))}`}
              aria-label="Previous month"
            >
              ‹
            </Link>
            <b>{monthLabel(month)}</b>
            <Link
              href={`${base}${current.path}${q(shiftMonth(month, 1))}`}
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
            href={`${base}${t.path}${t.monthly && month ? q(month) : ""}`}
            aria-current={t.key === tab ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
