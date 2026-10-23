import type { Metadata } from "next";
import Link from "next/link";
import { StatusBar } from "@/components/accounts/status-bar";
import { requireArea } from "@/lib/auth/session";
import {
  CAMPAIGN_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  WORK_STATUSES,
  WORK_STATUS_COLOR,
  WORK_STATUS_LABELS,
  dayLabel,
  monthLabel,
} from "@/lib/content/constants";
import { activeClientCapacity } from "@/lib/data/clients";
import { listDeskCards, type DeskCard } from "@/lib/data/accounts";
import { todayInGaborone } from "@/lib/format";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_PILL } from "@/lib/format/status";

export const metadata: Metadata = { title: "Clients" };

const QUESTIONNAIRE = {
  not_sent: "Not sent",
  sent: "Sent, not opened",
  opened: "Opened",
  received: "Answers received",
} as const;

export default async function ClientsPage() {
  const user = await requireArea("accounts");
  const month = `${todayInGaborone().slice(0, 7)}-01`;
  const [cards, capacity] = await Promise.all([
    listDeskCards(month),
    activeClientCapacity(),
  ]);

  return (
    <>
      <div className="home-head">
        <div>
          <h1>Clients</h1>
          <p className="sub">
            {monthLabel(month)} at a glance.{" "}
            {user.role === "ceo" ? "Every client." : "Your clients."} Open one
            to plan, brief and report.
          </p>
        </div>
        {user.role === "ceo" ? (
          <span className="cap">
            {capacity.active} of {capacity.max} active
          </span>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <h2>No clients yet</h2>
          <p>
            Clients assigned to you by the CEO appear here, with this
            month&apos;s plan, calendar, campaign brief and KPIs.
          </p>
        </div>
      ) : (
        <>
          <div className="cgrid">
            {cards.map((c) => (
              <ClientCard key={c.id} card={c} />
            ))}
          </div>
          <div className="legend" style={{ marginTop: 14 }}>
            {WORK_STATUSES.map((s) => (
              <span key={s}>
                <i style={{ background: WORK_STATUS_COLOR[s] }} />
                {WORK_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ClientCard({ card: c }: { card: DeskCard }) {
  const href = `/accounts/clients/${c.id}${c.onboarding ? "/onboarding" : ""}`;
  const m = c.month;
  return (
    <Link className="ccard" href={href}>
      <div className="top">
        <div>
          <h3>{c.name}</h3>
          <div className="meta">
            {c.industry || "No industry set"}
            {c.accountExecName ? ` · AE ${c.accountExecName}` : ""}
          </div>
        </div>
        <span className={`pill ${CLIENT_STATUS_PILL[c.status]}`}>
          {CLIENT_STATUS_LABELS[c.status]}
        </span>
      </div>

      {c.onboarding ? (
        <div className="kv">
          <span>Questionnaire</span>
          <span>{QUESTIONNAIRE[c.onboarding.questionnaire]}</span>
          <span>Brand kit</span>
          <span>{WORK_STATUS_LABELS[c.onboarding.kitStatus]}</span>
          <span>Client logins</span>
          <span>{c.onboarding.logins}</span>
        </div>
      ) : !m ? (
        <div className="notice">This month isn&apos;t planned yet</div>
      ) : (
        <>
          {m.waitingOnYou || m.overdueClientApprovals ? (
            <div className="row" style={{ gap: 6 }}>
              {m.waitingOnYou ? (
                <span className="pill s-warn">Waiting on you</span>
              ) : null}
              {m.overdueClientApprovals ? (
                <span className="pill s-bad">
                  {m.overdueClientApprovals} overdue with client
                </span>
              ) : null}
            </div>
          ) : null}
          <StatusBar byStatus={m.stats.byStatus} total={m.stats.total} />
          <div className="kv">
            <span>Published</span>
            <span>
              {m.stats.published} / {m.stats.total}
            </span>
            <span>Waiting on the client</span>
            <span>{m.stats.waitingOnClient}</span>
            <span>Month checklist</span>
            <span>{m.checksDone} / 8</span>
            <span>Calendar</span>
            <span>{PLAN_STATUS_LABELS[m.planStatus]}</span>
            <span>Campaign brief</span>
            <span>
              {m.campaignStatus
                ? CAMPAIGN_STATUS_LABELS[m.campaignStatus]
                : "Not started"}
            </span>
            <span>Next due</span>
            <span>
              {m.stats.next
                ? `${m.stats.next.slot_code} · ${dayLabel(m.stats.next.scheduled_date)}`
                : "—"}
            </span>
          </div>
        </>
      )}
    </Link>
  );
}
