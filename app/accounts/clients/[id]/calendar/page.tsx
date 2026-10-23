import type { Metadata } from "next";
import {
  CalendarTable,
  SendCalendarButton,
} from "@/components/accounts/calendar-table";
import { ClientHeader } from "@/components/accounts/client-header";
import { MonthEmpty } from "@/components/accounts/month-empty";
import { NotActive } from "@/components/accounts/not-active";
import { StatusBar } from "@/components/accounts/status-bar";
import { clientOr404, resolveMonth } from "@/lib/accounts/page";
import {
  DEFAULT_MIX,
  PILLAR_HINT,
  PILLAR_LABELS,
  PLAN_STATUS_LABELS,
  POST_PILLARS,
} from "@/lib/content/constants";
import { monthStats } from "@/lib/content/month";
import { getDeskMonth } from "@/lib/data/accounts";
import { formatDateTime, todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Content calendar" };

const PLAN_PILL = { draft: "", sent: "s-warn", approved: "s-good" } as const;

export default async function CalendarPage({
  params,
  searchParams,
}: PageProps<"/accounts/clients/[id]/calendar">) {
  const { id } = await params;
  const client = await clientOr404(id);
  const month = resolveMonth((await searchParams).month);
  const active = client.status === "active" || client.status === "paused";
  const m = active ? await getDeskMonth(id, month) : null;

  if (!m) {
    return (
      <>
        <ClientHeader client={client} tab="calendar" month={month} />
        {client.status === "active" ? (
          <MonthEmpty clientId={id} month={month} />
        ) : (
          <NotActive clientId={id} status={client.status} />
        )}
      </>
    );
  }

  const stats = monthStats(m.items, todayInGaborone());
  const mix = { ...DEFAULT_MIX, ...client.pillar_mix };
  const maxMix = Math.max(
    1,
    ...POST_PILLARS.map((p) => Math.max(mix[p] ?? 0, stats.byPillar[p])),
  );
  const missing = m.items.filter(
    (i) => !i.slot_code.startsWith("A") && !(i.topic ?? "").trim(),
  ).length;

  // Hint: more than 2 Showcase posts in a row, by date.
  const posts = m.items
    .filter((i) => i.format === "post")
    .sort(
      (a, b) =>
        (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "") ||
        a.slot_code.localeCompare(b.slot_code),
    );
  let run = 0;
  let longRun = false;
  for (const p of posts) {
    run = p.pillar === "showcase" ? run + 1 : 0;
    if (run > 2) longRun = true;
  }

  return (
    <>
      <ClientHeader client={client} tab="calendar" month={month} />
      <div className="cal-sum">
        <section className="panel">
          <h3 style={{ marginBottom: 10 }}>
            Post pillar mix · planned vs target
          </h3>
          <div className="pillmix">
            {POST_PILLARS.map((p) => {
              const v = stats.byPillar[p];
              const t = mix[p] ?? 0;
              return (
                <div key={p}>
                  <span title={PILLAR_HINT[p]}>{PILLAR_LABELS[p]}</span>
                  <span className="track">
                    <i style={{ width: `${(v / maxMix) * 100}%` }} />
                  </span>
                  <b className={v !== t ? "off" : undefined}>
                    {v}/{t}
                  </b>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h3 style={{ marginBottom: 10 }}>Status</h3>
          <StatusBar
            byStatus={stats.byStatus}
            total={stats.total}
            height={12}
            legend
          />
          <p className="sub" style={{ fontSize: 13, marginTop: 10 }}>
            Calendar rules: no more than 2 Showcase posts in a row; keep 2 posts
            flexible for mid-month news.
          </p>
          {longRun ? (
            <p className="err" style={{ marginTop: 6 }}>
              More than 2 Showcase posts run in a row. Swap one for another
              pillar.
            </p>
          ) : null}
        </section>
      </div>

      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className={`pill ${PLAN_PILL[m.plan_status]}`}>
            {PLAN_STATUS_LABELS[m.plan_status]}
          </span>
          <span className="sub" style={{ margin: 0 }}>
            {m.plan_status === "draft"
              ? missing
                ? `${missing} slots still need a topic.`
                : "Every slot has a topic. Send it when you're happy."
              : m.plan_status === "sent"
                ? `Sent ${formatDateTime(m.plan_sent_at)}. Designers start once the client approves.`
                : `Approved ${formatDateTime(m.plan_approved_at)}. It's on the designers' board.`}
          </span>
        </div>
        {m.plan_status === "draft" ? (
          <SendCalendarButton monthId={m.id} missing={missing} />
        ) : null}
      </div>

      {m.plan_status === "draft" && m.feedback.length ? (
        <div className="notice" style={{ marginBottom: 12 }}>
          <b style={{ color: "var(--ink)" }}>The client asked for changes:</b>{" "}
          {m.feedback[0].body}
        </div>
      ) : null}

      <CalendarTable
        items={m.items}
        month={month}
        platforms={client.platforms}
      />
    </>
  );
}
