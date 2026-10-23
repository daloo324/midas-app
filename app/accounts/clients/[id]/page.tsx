import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientHeader } from "@/components/accounts/client-header";
import { CheckToggle } from "@/components/accounts/month-controls";
import { MonthEmpty } from "@/components/accounts/month-empty";
import { NotActive } from "@/components/accounts/not-active";
import { StatusBar } from "@/components/accounts/status-bar";
import { clientOr404, resolveMonth } from "@/lib/accounts/page";
import {
  CAMPAIGN_STATUS_LABELS,
  EXPECTATIONS,
  dayLabel,
  monthParam,
} from "@/lib/content/constants";
import { checklist, monthStats } from "@/lib/content/month";
import { getDeskMonth } from "@/lib/data/accounts";
import { formatDay, formatDateTime, todayInGaborone } from "@/lib/format";
import { cx } from "@/lib/cx";

export const metadata: Metadata = { title: "Month plan" };

function waited(sinceIso: string | null, today: string) {
  if (!sinceIso) return "";
  const days = Math.max(
    0,
    Math.round(
      (Date.parse(`${today}T00:00:00Z`) -
        Date.parse(sinceIso.slice(0, 10) + "T00:00:00Z")) /
        86_400_000,
    ),
  );
  return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

export default async function MonthPlanPage({
  params,
  searchParams,
}: PageProps<"/accounts/clients/[id]">) {
  const { id } = await params;
  const client = await clientOr404(id);
  if (client.status === "onboarding" || client.status === "lead_won")
    redirect(`/accounts/clients/${id}/onboarding`);
  const month = resolveMonth((await searchParams).month);
  const today = todayInGaborone();
  const m =
    client.status === "active" || client.status === "paused"
      ? await getDeskMonth(id, month)
      : null;

  return (
    <>
      <ClientHeader client={client} tab="plan" month={month} />
      {!m ? (
        client.status === "active" ? (
          <MonthEmpty clientId={id} month={month} />
        ) : (
          <NotActive clientId={id} status={client.status} />
        )
      ) : (
        <Plan
          clientId={id}
          month={month}
          m={m}
          goal={client.main_goal}
          today={today}
        />
      )}
    </>
  );
}

function Plan({
  clientId,
  month,
  m,
  goal,
  today,
}: {
  clientId: string;
  month: string;
  m: NonNullable<Awaited<ReturnType<typeof getDeskMonth>>>;
  goal: string | null;
  today: string;
}) {
  const stats = monthStats(m.items, today);
  const steps = checklist(
    {
      month,
      items: m.items,
      planStatus: m.plan_status,
      campaign: m.campaign,
      reviewPublishedAt: m.review_published_at,
      manual: m.checklist,
    },
    today,
  );
  const done = steps.filter((s) => s.done).length;
  const waiting = m.items.filter(
    (i) => i.status === "client_review" && !i.slot_code.startsWith("A"),
  );
  const q = `?month=${monthParam(month)}`;

  return (
    <div className="two">
      <section className="panel">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2>Month checklist</h2>
          <span
            className={`pill ${done === steps.length ? "s-good" : "s-warn"}`}
          >
            {done} of {steps.length} done
          </span>
        </div>
        <ul className="checks">
          {steps.map((s) => {
            const when = s.overdue
              ? `${s.when} · overdue since ${formatDay(s.due)}`
              : s.when;
            const body = (
              <span>
                <span>{s.label}</span>
                <small>{s.manual ? when : `${when} · ticks itself`}</small>
              </span>
            );
            return (
              <li key={s.key} className={s.overdue ? "late" : undefined}>
                {s.manual ? (
                  <label className={s.done ? "done" : undefined}>
                    <CheckToggle monthId={m.id} check={s.key} done={s.done} />
                    {body}
                  </label>
                ) : (
                  <div className={cx("auto", s.done && "done")}>
                    <span
                      className={cx("tick", s.done && "on")}
                      aria-label={s.done ? "Done" : "Not done"}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="stack">
        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>This month&apos;s content</h2>
          <StatusBar
            byStatus={stats.byStatus}
            total={stats.total}
            height={12}
            legend
          />
          <div className="kv" style={{ marginTop: 12 }}>
            <span>Next due</span>
            <span>
              {stats.next
                ? `${stats.next.slot_code} · ${dayLabel(stats.next.scheduled_date)}`
                : "—"}
            </span>
            <span>Campaign brief</span>
            <span>
              {m.campaign
                ? CAMPAIGN_STATUS_LABELS[m.campaign.status]
                : "Not started"}
            </span>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Link
              className="btn"
              href={`/accounts/clients/${clientId}/calendar${q}`}
            >
              Open calendar
            </Link>
            <Link
              className="btn"
              href={`/accounts/clients/${clientId}/campaign${q}`}
            >
              Open brief
            </Link>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Waiting on the client</h2>
          {waiting.length ? (
            <div className="kv">
              {waiting.map((i) => (
                <WaitingRow
                  key={i.id}
                  slot={i.slot_code}
                  topic={i.topic}
                  since={waited(i.shown_to_client_at, today)}
                />
              ))}
            </div>
          ) : (
            <p className="sub" style={{ margin: 0 }}>
              Nothing is waiting on the client.
            </p>
          )}
          {m.plan_status === "sent" ? (
            <p className="sub" style={{ fontSize: 13, marginTop: 10 }}>
              The calendar was sent {formatDateTime(m.plan_sent_at)} and is
              waiting for approval.
            </p>
          ) : null}
        </section>

        <section className="panel">
          <h2>What the client expects</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            Their main goal is outlined in gold. Brand Launch covers the first
            three fully.
          </p>
          <div className="exp">
            {EXPECTATIONS.map((e) => (
              <div key={e.key} className={goal === e.key ? "main" : undefined}>
                <span>
                  <b>{e.label}</b>
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    {e.d}
                  </span>
                </span>
                <span className={`pill ${e.covered ? "s-good" : "s-warn"}`}>
                  {e.covered ? "Covered" : "Partly"}
                </span>
              </div>
            ))}
          </div>
          <p className="sub" style={{ fontSize: 13, marginTop: 10 }}>
            Results depend on the client&apos;s offer, ad budget and how fast
            they reply to messages. Set the main goal in Client profile.
          </p>
        </section>
      </div>
    </div>
  );
}

function WaitingRow({
  slot,
  topic,
  since,
}: {
  slot: string;
  topic: string | null;
  since: string;
}) {
  return (
    <>
      <span>
        {slot} · {topic || "No topic"}
      </span>
      <span>{since}</span>
    </>
  );
}
