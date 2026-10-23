import Link from "next/link";
import { CAMPAIGN_STATUS_LABELS, monthLabel } from "@/lib/content/constants";
import { listCampaigns } from "@/lib/data/portal";
import { formatDay, formatMoney, todayInGaborone } from "@/lib/format";
import { CLIENT_STATUS } from "@/lib/portal/labels";
import type { Viewer } from "@/lib/portal/viewer";

const ADS: Record<string, string> = {
  A01: "Feed ad",
  A02: "Story ad",
  A03: "Test version",
};

export async function CampaignsPage({ viewer }: { viewer: Viewer }) {
  const list = await listCampaigns(viewer.clientId);
  const thisMonth = `${todayInGaborone().slice(0, 7)}-01`;
  const current = list.filter(
    (c) => c.month! >= thisMonth && c.status !== "complete",
  );
  const past = list.filter((c) => !current.includes(c));
  return (
    <>
      <div className="head">
        <div>
          <h1>Campaigns</h1>
          <p className="sub">
            One paid campaign a month. Midas makes the ads; the ad budget is
            paid by you straight to Meta.
          </p>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="panel">
          <p className="sub" style={{ margin: 0 }}>
            Your first campaign brief appears here when your account executive
            sends it.
          </p>
        </div>
      ) : null}
      <div className="stack">
        {current.map((c) => {
          const audience = [
            c.audience.location,
            c.audience.age && `ages ${c.audience.age}`,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <div
              key={c.id}
              className="panel"
              style={
                c.status === "sent" ? { borderColor: "var(--warn)" } : undefined
              }
            >
              <div className="row between">
                <div>
                  <div className="label">
                    {monthLabel(c.month!)} ·{" "}
                    {CAMPAIGN_STATUS_LABELS[c.status!].toLowerCase()}
                  </div>
                  <h2 style={{ marginTop: 4 }}>
                    {c.name ?? `${monthLabel(c.month!)} campaign`}
                  </h2>
                </div>
                <span
                  className={`pill ${c.status === "sent" ? "s-warn" : c.status === "live" ? "s-info" : "s-good"}`}
                >
                  {c.status === "sent"
                    ? "Brief waiting for you"
                    : CAMPAIGN_STATUS_LABELS[c.status!]}
                </span>
              </div>
              <div className="plist" style={{ marginTop: 12 }}>
                <div>
                  <span>Goal</span>
                  <b>{c.goal ?? "—"}</b>
                </div>
                <div>
                  <span>Offer</span>
                  <b>{c.offer ?? "—"}</b>
                </div>
                <div>
                  <span>Dates</span>
                  <b>
                    {c.start_date && c.end_date
                      ? `${formatDay(c.start_date)} – ${formatDay(c.end_date)}`
                      : "—"}
                  </b>
                </div>
                <div>
                  <span>Audience</span>
                  <b>{audience || "—"}</b>
                </div>
                <div>
                  <span>Ad budget (paid to Meta)</span>
                  <b>{c.ad_budget != null ? formatMoney(c.ad_budget) : "—"}</b>
                </div>
                <div>
                  <span>Ads</span>
                  <b>
                    {c.ads.length
                      ? c.ads
                          .map(
                            (a) =>
                              `${ADS[a.slot_code!] ?? a.slot_code}: ${CLIENT_STATUS[a.status!]?.label ?? "in design"}`,
                          )
                          .join(" · ")
                      : "Feed ad, story ad, 1 test version (in design)"}
                  </b>
                </div>
              </div>
              {c.status === "sent" ? (
                <Link
                  className="btn pri"
                  href={`${viewer.base}/approvals`}
                  style={{ marginTop: 14 }}
                >
                  Review the brief
                </Link>
              ) : null}
            </div>
          );
        })}
        {past.length ? (
          <div className="g2">
            {past.map((c) => {
              const m = c.results_metrics;
              return (
                <div key={c.id} className="panel">
                  <div className="label">
                    {monthLabel(c.month!)} ·{" "}
                    {CAMPAIGN_STATUS_LABELS[c.status!].toLowerCase()}
                  </div>
                  <h2 style={{ marginTop: 4 }}>
                    {c.name ?? `${monthLabel(c.month!)} campaign`}
                  </h2>
                  {m.results != null || m.spend != null ? (
                    <div className="g3" style={{ marginTop: 12, gap: 10 }}>
                      <div>
                        <div className="big" style={{ fontSize: 24 }}>
                          {m.results ?? "—"}
                        </div>
                        <span className="sub">results</span>
                      </div>
                      <div>
                        <div className="big" style={{ fontSize: 24 }}>
                          {m.spend != null ? formatMoney(m.spend) : "—"}
                        </div>
                        <span className="sub">spent</span>
                      </div>
                      <div>
                        <div className="big" style={{ fontSize: 24 }}>
                          {m.cost_per_result != null
                            ? formatMoney(m.cost_per_result)
                            : m.spend && m.results
                              ? formatMoney(m.spend / m.results)
                              : "—"}
                        </div>
                        <span className="sub">per result</span>
                      </div>
                    </div>
                  ) : null}
                  {c.results ? (
                    <p className="sub" style={{ marginTop: 10 }}>
                      {c.results}
                    </p>
                  ) : (
                    <p className="sub">
                      Results go into your monthly report when it ends.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
