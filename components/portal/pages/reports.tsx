import Link from "next/link";
import { monthLabel, monthParam, shiftMonth } from "@/lib/content/constants";
import {
  getPortalClient,
  listReports,
  topPiecePreview,
} from "@/lib/data/portal";
import { formatMoney } from "@/lib/format";
import type { Viewer } from "@/lib/portal/viewer";
import { ReachChart } from "../reach-chart";

type M = Record<string, number>;
type Row = { key: string; label: string; lowerIsBetter?: boolean };

const CATS: { key: string; label: string; q: string; rows: Row[] }[] = [
  {
    key: "visibility",
    label: "Visibility",
    q: "Are more people seeing your brand?",
    rows: [
      { key: "reach", label: "Accounts reached" },
      { key: "views", label: "Views" },
      { key: "followers", label: "Followers" },
    ],
  },
  {
    key: "credibility",
    label: "Credibility",
    q: "Does your brand look established and trusted?",
    rows: [
      { key: "profile_visits", label: "Profile visits" },
      { key: "saves", label: "Saves" },
      { key: "reviews", label: "New reviews" },
    ],
  },
  {
    key: "engagement",
    label: "Engagement",
    q: "Are people reacting and talking back?",
    rows: [
      { key: "interactions", label: "Interactions" },
      { key: "_er", label: "Engagement rate" },
      { key: "comments", label: "Comments" },
      { key: "reel_plays", label: "Reel plays" },
    ],
  },
  {
    key: "results",
    label: "Results",
    q: "Is it bringing in business?",
    rows: [
      { key: "messages", label: "Chats started" },
      { key: "link_clicks", label: "Link clicks" },
      { key: "_cpr", label: "Cost per ad result", lowerIsBetter: true },
      { key: "enquiries", label: "Enquiries you reported" },
    ],
  },
];

function value(m: M | undefined, key: string): number | null {
  if (!m) return null;
  if (key === "_er")
    return m.reach ? ((m.interactions ?? 0) / m.reach) * 100 : null;
  if (key === "_cpr")
    return m.ad_results ? (m.ad_spend ?? 0) / m.ad_results : null;
  return m[key] ?? null;
}
function show(key: string, v: number | null) {
  if (v == null) return "—";
  if (key === "_er") return `${v.toFixed(1)}%`;
  if (key === "_cpr") return formatMoney(v);
  return Math.round(v).toLocaleString("en-GB");
}

export async function ReportsPage({
  viewer,
  monthParamValue,
}: {
  viewer: Viewer;
  monthParamValue: string | undefined;
}) {
  const [{ reviews, kpis }, client] = await Promise.all([
    listReports(viewer.clientId),
    getPortalClient(viewer.clientId),
  ]);
  if (!reviews.length) {
    return (
      <>
        <div className="head">
          <div>
            <h1>Reports &amp; insights</h1>
            <p className="sub">
              Your monthly results, compared with the month before. A new report
              arrives by the 3rd of each month.
            </p>
          </div>
        </div>
        <div className="panel">
          <p className="sub" style={{ margin: 0 }}>
            Your first monthly review appears here once your account executive
            publishes it.
          </p>
        </div>
      </>
    );
  }
  const chosen =
    reviews.find((r) => monthParam(r.month) === monthParamValue) ?? reviews[0];
  const metrics = kpis.find((k) => k.month === chosen.month)?.metrics;
  const prevMonth = shiftMonth(chosen.month, -1);
  const prev =
    kpis.find((k) => k.month === prevMonth)?.metrics ??
    (Object.keys(client?.baseline ?? {}).length ? client!.baseline : undefined);
  const prevLabel = kpis.some((k) => k.month === prevMonth)
    ? monthLabel(prevMonth)
    : "your starting point";
  const top = await topPiecePreview(
    viewer.clientId,
    chosen.month,
    chosen.top_piece,
  );

  const points = [
    ...(client?.baseline.reach != null
      ? [{ label: "Before Midas", value: client.baseline.reach }]
      : []),
    ...kpis
      .filter((k) => k.metrics.reach != null)
      .map((k) => ({
        label: monthLabel(k.month).split(" ")[0].slice(0, 3),
        value: k.metrics.reach,
      })),
  ];
  const cats = [...CATS].sort(
    (a, b) =>
      Number(b.key === client?.main_goal) - Number(a.key === client?.main_goal),
  );

  return (
    <>
      <div className="head">
        <div>
          <h1>Reports &amp; insights</h1>
          <p className="sub">
            Your monthly results, compared with the month before. A new report
            arrives by the 3rd of each month.
          </p>
        </div>
        <div className="filters">
          {[...reviews].reverse().map((r) => (
            <Link
              key={r.month}
              className="chip"
              href={`${viewer.base}/reports?month=${monthParam(r.month)}`}
              aria-current={r.month === chosen.month ? "page" : undefined}
            >
              {monthLabel(r.month)}
            </Link>
          ))}
        </div>
      </div>
      <div className="stack">
        <div className="g2">
          <div className="panel">
            <h2>Accounts reached each month</h2>
            <p className="sub" style={{ marginBottom: 10 }}>
              People who saw at least one of your posts, stories or reels.
            </p>
            {points.length ? (
              <ReachChart points={points} />
            ) : (
              <p className="sub">No reach figures yet.</p>
            )}
          </div>
          <div className="panel">
            <h2>What we learned in {monthLabel(chosen.month)}</h2>
            <div className="plist" style={{ marginTop: 10 }}>
              <div style={{ display: "block" }}>
                <div className="label">What worked</div>
                <p style={{ margin: "4px 0 0" }}>{chosen.working}</p>
              </div>
              <div style={{ display: "block" }}>
                <div className="label">What we&apos;re changing</div>
                <p style={{ margin: "4px 0 0" }}>{chosen.adjust}</p>
              </div>
              {chosen.top_piece ? (
                <div style={{ display: "block" }}>
                  <div className="label">Top piece</div>
                  <p style={{ margin: "4px 0 0" }}>
                    {chosen.top_piece}
                    {top?.topic ? ` · ${top.topic}` : ""}
                  </p>
                  {top?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img
                      src={top.url}
                      alt={`Preview of ${chosen.top_piece}`}
                      style={{
                        maxWidth: 160,
                        borderRadius: 8,
                        marginTop: 8,
                        border: "1px solid var(--line)",
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
              <div style={{ display: "block" }}>
                <div className="label">Next month&apos;s focus</div>
                <p style={{ margin: "4px 0 0" }}>{chosen.focus}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="kcats">
          {cats.map((c) => (
            <div
              key={c.key}
              className="panel"
              style={
                client?.main_goal === c.key
                  ? { outline: "2px solid var(--gold)" }
                  : undefined
              }
            >
              <div className="row between">
                <h2>{c.label}</h2>
                {client?.main_goal === c.key ? (
                  <span className="pill s-gold">Your main goal</span>
                ) : null}
                {c.key === "results" ? (
                  <span
                    className="pill s-warn"
                    title="Depends on your offer, ad budget and how quickly messages are answered"
                  >
                    Shared with you
                  </span>
                ) : null}
              </div>
              <p className="sub" style={{ marginBottom: 8 }}>
                {c.q}
              </p>
              {c.rows.map((r) => {
                const v = value(metrics, r.key);
                const p = value(prev, r.key);
                let delta = <span className="delta flat">—</span>;
                if (v != null && p) {
                  const pct = ((v - p) / Math.abs(p)) * 100;
                  const better = r.lowerIsBetter ? pct < 0 : pct > 0;
                  delta = (
                    <span
                      className={`delta ${Math.abs(pct) < 0.5 ? "flat" : better ? "up" : "down"}`}
                    >
                      {pct > 0 ? "+" : ""}
                      {Math.round(pct)}%
                    </span>
                  );
                }
                return (
                  <div className="krow" key={r.key}>
                    <span>{r.label}</span>
                    <b>{show(r.key, v)}</b>
                    {delta}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="sub">
          Change compares {monthLabel(chosen.month)} with {prevLabel}. Results
          figures depend partly on your offer, ad budget and how quickly
          messages are answered.
        </p>
      </div>
    </>
  );
}
