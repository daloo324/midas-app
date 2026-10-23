import type { Metadata } from "next";
import { ClientHeader } from "@/components/accounts/client-header";
import {
  KpiInput,
  PublishReview,
  ReviewField,
  TopPiece,
} from "@/components/accounts/kpi-panel";
import { MonthEmpty } from "@/components/accounts/month-empty";
import { NotActive } from "@/components/accounts/not-active";
import { clientOr404, resolveMonth } from "@/lib/accounts/page";
import { requireArea } from "@/lib/auth/session";
import {
  KPI_CATEGORIES,
  METRIC_SOURCE_LABELS,
  PILLAR_LABELS,
  monthLabel,
  shiftMonth,
  type CalcKey,
  type KpiKey,
} from "@/lib/content/constants";
import { getDeskKpis, getDeskMonth, type DeskKpis } from "@/lib/data/accounts";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "KPIs & review" };

function Delta({
  cur,
  old,
}: {
  cur: number | null | undefined;
  old: number | null | undefined;
}) {
  if (cur == null || old == null) return <span className="delta flat">—</span>;
  if (old === 0)
    return <span className="delta flat">{cur === 0 ? "0%" : "new"}</span>;
  const d = ((cur - old) / Math.abs(old)) * 100;
  return (
    <span className={`delta ${d > 0.5 ? "up" : d < -0.5 ? "down" : "flat"}`}>
      {d > 0 ? "+" : ""}
      {Math.round(d)}%
    </span>
  );
}

type Calc = NonNullable<DeskKpis["calc"]>;
function calcValue(
  key: CalcKey,
  c: Calc | null,
): { v: number | null; s: string } {
  if (!c) return { v: null, s: "—" };
  switch (key) {
    case "net_new_followers":
      return {
        v: c.net_new_followers,
        s:
          c.net_new_followers == null
            ? "—"
            : Math.round(c.net_new_followers).toLocaleString("en-GB"),
      };
    case "consistency": {
      if (!c.planned) return { v: null, s: "—" };
      const r = (c.published ?? 0) / c.planned;
      return {
        v: r,
        s: `${c.published ?? 0}/${c.planned} · ${Math.round(r * 100)}%`,
      };
    }
    case "first_round_rate":
      return {
        v: c.first_round_rate,
        s:
          c.first_round_rate == null
            ? "—"
            : `${Math.round(c.first_round_rate * 100)}%`,
      };
    case "engagement_rate":
      return {
        v: c.engagement_rate,
        s:
          c.engagement_rate == null
            ? "—"
            : `${(c.engagement_rate * 100).toFixed(1)}%`,
      };
    case "cost_per_result":
      return {
        v: c.cost_per_result,
        s: c.cost_per_result == null ? "—" : formatMoney(c.cost_per_result),
      };
  }
}

export default async function KpisPage({
  params,
  searchParams,
}: PageProps<"/accounts/clients/[id]/kpis">) {
  const user = await requireArea("accounts");
  const { id } = await params;
  const client = await clientOr404(id);
  const month = resolveMonth((await searchParams).month);
  const prevMonth = shiftMonth(month, -1);
  const active = client.status === "active" || client.status === "paused";
  const m = active ? await getDeskMonth(id, month) : null;

  if (!m) {
    return (
      <>
        <ClientHeader client={client} tab="kpis" month={month} />
        {client.status === "active" ? (
          <MonthEmpty clientId={id} month={month} />
        ) : (
          <NotActive clientId={id} status={client.status} />
        )}
      </>
    );
  }

  const k = await getDeskKpis(id, month, prevMonth);
  const published = m.review_published_at !== null;
  const locked = k.locked || published;
  const compareWith = k.previous
    ? monthLabel(prevMonth)
    : "the baseline in Client profile";
  const old = (key: KpiKey) =>
    k.previous?.[key] ?? (k.previous ? undefined : client.baseline[key]);
  const topOptions = m.items
    .filter((i) => i.status === "published")
    .map((i) => ({
      value: i.slot_code,
      label: `${i.slot_code} · ${i.topic || PILLAR_LABELS[i.pillar]}`,
    }));

  return (
    <>
      <ClientHeader client={client} tab="kpis" month={month} />
      <div className="row between" style={{ margin: "-6px 0 14px" }}>
        <p className="sub" style={{ margin: 0 }}>
          Enter month-end figures from Meta Business Suite insights and Ads
          Manager. Changes compare with {compareWith}.
        </p>
        {published ? (
          <span className="pill s-good">
            Published {formatDateTime(m.review_published_at)} · KPIs locked
          </span>
        ) : null}
      </div>

      <div className="kgrid">
        {KPI_CATEGORIES.map((cat) => (
          <section
            key={cat.key}
            className={`panel kcat${client.main_goal === cat.key ? "main" : ""}`}
          >
            <header>
              <h2>{cat.label}</h2>
              <span
                className={`pill ${cat.key === "results" ? "s-warn" : "s-good"} scope`}
              >
                {cat.key === "results"
                  ? "Partly in our control"
                  : "Brand Launch covers"}
              </span>
            </header>
            <p className="why">
              {cat.question}
              {client.main_goal === cat.key ? (
                <b> Client&apos;s main goal.</b>
              ) : null}
            </p>
            {cat.rows.map((r) => {
              if ("calc" in r) {
                const cur = calcValue(r.calc, k.calc);
                const prev = calcValue(r.calc, k.previousCalc);
                return (
                  <div className="krow" key={r.calc}>
                    <span>
                      {r.label}
                      <small>Calculated</small>
                    </span>
                    <span className="auto">{cur.s}</span>
                    <Delta cur={cur.v} old={prev.v} />
                  </div>
                );
              }
              const source = k.sources[r.key] as
                keyof typeof METRIC_SOURCE_LABELS | undefined;
              return (
                <div className="krow" key={r.key}>
                  <label htmlFor={`k_${r.key}`}>
                    {r.label}
                    <small>
                      {source ? METRIC_SOURCE_LABELS[source] : "Manual"}
                    </small>
                  </label>
                  <KpiInput
                    clientId={id}
                    month={month}
                    kpi={r.key}
                    value={k.metrics[r.key]}
                    disabled={locked}
                    label={r.label}
                  />
                  <Delta cur={k.metrics[r.key]} old={old(r.key)} />
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2>Monthly analytics review</h2>
          <PublishReview
            monthId={m.id}
            published={published}
            isCeo={user.role === "ceo"}
          />
        </div>
        <div className="fgrid">
          <label className="f" htmlFor="rv_working">
            What&apos;s working
            <ReviewField
              id="rv_working"
              monthId={m.id}
              field="working"
              value={m.review.working}
              disabled={published}
              multiline
            />
          </label>
          <label className="f" htmlFor="rv_adjust">
            What to adjust
            <ReviewField
              id="rv_adjust"
              monthId={m.id}
              field="adjust"
              value={m.review.adjust}
              disabled={published}
              multiline
            />
          </label>
          <label className="f">
            Top piece this month
            <TopPiece
              monthId={m.id}
              value={m.review.top_piece}
              options={topOptions}
              disabled={published}
            />
          </label>
          <label className="f" htmlFor="rv_focus">
            Next month&apos;s focus
            <ReviewField
              id="rv_focus"
              monthId={m.id}
              field="focus"
              value={m.review.focus}
              disabled={published}
              placeholder="e.g. more Proof posts, test reels"
            />
          </label>
        </div>
        <p className="sub" style={{ fontSize: 13, marginTop: 12 }}>
          Publishing shows the review and this month&apos;s KPIs in the
          client&apos;s portal, tells them it&apos;s ready, and locks the
          numbers.
          {user.role === "ceo" ? "" : " Only the CEO can unpublish."}
        </p>
      </section>
    </>
  );
}
