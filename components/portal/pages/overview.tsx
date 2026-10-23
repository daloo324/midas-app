import Link from "next/link";
import {
  CLIENT_STATUS,
  CLIENT_STATUS_ORDER,
  FORMAT_LABEL,
  longDay,
} from "@/lib/portal/labels";
import type { Viewer } from "@/lib/portal/viewer";
import { dayLabel, monthLabel, shiftMonth } from "@/lib/content/constants";
import {
  getPortalClient,
  getPortalKit,
  listApprovals,
  listReports,
  monthItems,
  monthTotals,
} from "@/lib/data/portal";
import { formatMoney, todayInGaborone } from "@/lib/format";

function Delta({
  v,
  p,
  against,
}: {
  v: number | null | undefined;
  p: number | null | undefined;
  against: string;
}) {
  if (v == null || !p) return <span className="delta flat">—</span>;
  const d = ((v - p) / Math.abs(p)) * 100;
  return (
    <div
      className={`delta ${d > 0.5 ? "up" : d < -0.5 ? "down" : "flat"}`}
      style={{ textAlign: "left" }}
    >
      {d > 0 ? "▲ +" : d < 0 ? "▼ " : ""}
      {Math.round(d)}% vs {against}
    </div>
  );
}

export async function OverviewPage({ viewer }: { viewer: Viewer }) {
  const today = todayInGaborone();
  const month = `${today.slice(0, 7)}-01`;
  const [client, approvals, totals, items, reports, kit] = await Promise.all([
    getPortalClient(viewer.clientId),
    listApprovals(viewer.clientId),
    monthTotals(viewer.clientId, month),
    monthItems(viewer.clientId, month),
    listReports(viewer.clientId),
    getPortalKit(viewer.clientId),
  ]);
  const counts = Object.fromEntries(
    CLIENT_STATUS_ORDER.map((s) => [
      s,
      items.filter((i) => i.status === s).length,
    ]),
  );
  const total = Math.max(totals.planned, items.length);
  const next = items.filter(
    (i) =>
      i.scheduled_date && i.scheduled_date >= today && i.status !== "published",
  )[0];
  const review = reports.reviews[0];
  const k = review
    ? reports.kpis.find((x) => x.month === review.month)?.metrics
    : undefined;
  const pk = review
    ? reports.kpis.find((x) => x.month === shiftMonth(review.month, -1))
        ?.metrics
    : undefined;
  const baseline = client?.baseline ?? {};
  const prevFollowers = pk?.followers ?? baseline.followers;
  const prevPrevFollowers = review
    ? (reports.kpis.find((x) => x.month === shiftMonth(review.month, -2))
        ?.metrics.followers ?? baseline.followers)
    : undefined;
  const against = pk
    ? monthLabel(shiftMonth(review!.month, -1)).split(" ")[0]
    : "before Midas";
  const nearest = approvals[0]?.due;

  // Journey: onboarding -> brand kit -> monthly content -> review and renew.
  const kitDone = kit?.status === "approved";
  const monthsIn = client?.start_date
    ? Math.max(
        1,
        (Number(today.slice(0, 4)) - Number(client.start_date.slice(0, 4))) *
          12 +
          Number(today.slice(5, 7)) -
          Number(client.start_date.slice(5, 7)) +
          1,
      )
    : 0;
  const stage =
    client?.status === "active" ? "content" : kitDone ? "content" : "kit";

  return (
    <>
      <div className="head">
        <div>
          <h1>Dumela, {viewer.firstName}</h1>
          <p className="sub">
            Here&apos;s where {viewer.clientName} stands on {longDay(today)}.
          </p>
        </div>
      </div>
      <div className="stack">
        {approvals.length ? (
          <div
            className="panel"
            style={{
              borderColor: "var(--warn)",
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2>
                {approvals.length} item{approvals.length > 1 ? "s" : ""} waiting
                for your approval
              </h2>
              <p className="sub">
                Approve by {longDay(nearest!)} so your content stays on time.
              </p>
            </div>
            <Link className="btn pri" href={`${viewer.base}/approvals`}>
              Review now
            </Link>
          </div>
        ) : (
          <div className="panel" style={{ borderColor: "var(--good)" }}>
            <h2>You&apos;re all caught up</h2>
            <p className="sub">Nothing is waiting for your approval.</p>
          </div>
        )}

        <div className="g3">
          <div className="panel">
            <div className="label">
              {monthLabel(month).split(" ")[0]} content
            </div>
            <div className="big" style={{ marginTop: 8 }}>
              {counts.published ?? 0}
              <span style={{ fontSize: 18, color: "var(--muted)" }}>
                {" "}
                / {total}
              </span>
            </div>
            <p className="sub">pieces published</p>
            <div className="bar" style={{ marginTop: 12 }}>
              {total
                ? CLIENT_STATUS_ORDER.map((s) =>
                    counts[s] ? (
                      <i
                        key={s}
                        style={{
                          width: `${(counts[s] / total) * 100}%`,
                          background: CLIENT_STATUS[s]!.color,
                        }}
                      />
                    ) : null,
                  )
                : null}
            </div>
            <div className="legend">
              {CLIENT_STATUS_ORDER.filter((s) => counts[s]).map((s) => (
                <span key={s}>
                  <i style={{ background: CLIENT_STATUS[s]!.color }} />
                  {CLIENT_STATUS[s]!.label} {counts[s]}
                </span>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="label">Next post</div>
            {next ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr",
                  gap: 12,
                  marginTop: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    aspectRatio: "4 / 5",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {next.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img
                      src={next.previewUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                </div>
                <div>
                  <b>{next.topic}</b>
                  <p className="sub">
                    {dayLabel(next.scheduled_date)} ·{" "}
                    {FORMAT_LABEL[next.format]}
                  </p>
                  <span
                    className={`pill ${CLIENT_STATUS[next.status]?.pill ?? ""}`}
                  >
                    {CLIENT_STATUS[next.status]?.label}
                  </span>
                </div>
              </div>
            ) : (
              <p className="sub">Nothing scheduled yet this month.</p>
            )}
          </div>
          <div className="panel">
            <div className="label">Balance due</div>
            <div className="big" style={{ marginTop: 8 }}>
              {formatMoney(0)}
            </div>
            <p className="sub">Nothing outstanding</p>
            <Link
              className="btn sm"
              href={`${viewer.base}/invoices`}
              style={{ marginTop: 12 }}
            >
              Invoices
            </Link>
          </div>
        </div>

        <div className="g2">
          <div className="panel">
            {review ? (
              <>
                <div className="row between">
                  <h2>{monthLabel(review.month).split(" ")[0]} at a glance</h2>
                  <Link
                    className="link"
                    href={`${viewer.base}/reports?month=${review.month.slice(0, 7)}`}
                  >
                    Full report
                  </Link>
                </div>
                <div className="g3" style={{ marginTop: 14, gap: 12 }}>
                  {[
                    ["Accounts reached", k?.reach, pk?.reach ?? baseline.reach],
                    [
                      "New followers",
                      k?.followers != null && prevFollowers != null
                        ? k.followers - prevFollowers
                        : null,
                      prevFollowers != null && prevPrevFollowers != null && pk
                        ? prevFollowers - prevPrevFollowers
                        : null,
                    ],
                    [
                      "Chats started",
                      k?.messages,
                      pk?.messages ?? baseline.messages,
                    ],
                  ].map(([label, v, p]) => (
                    <div key={label as string}>
                      <div className="label">{label}</div>
                      <div
                        className="big"
                        style={{ fontSize: 26, marginTop: 6 }}
                      >
                        {v == null
                          ? "—"
                          : Math.round(v as number).toLocaleString("en-GB")}
                      </div>
                      <Delta
                        v={v as number | null}
                        p={p as number | null}
                        against={against}
                      />
                    </div>
                  ))}
                </div>
                {review.working ? (
                  <p className="sub" style={{ marginTop: 14 }}>
                    {review.working}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h2>Your first report</h2>
                <p className="sub">
                  Your first monthly review arrives by the 3rd of the month
                  after your first month of content.
                </p>
              </>
            )}
          </div>
          <div className="panel">
            <h2>Your journey with Midas</h2>
            <div className="steps">
              <div
                className={
                  kitDone || client?.status === "active" ? "done" : "now"
                }
              >
                <b>Onboarding</b>
                <span>
                  {client?.start_date ? monthLabel(client.start_date) : "Now"}
                </span>
              </div>
              <div
                className={
                  kitDone ? "done" : stage === "kit" ? "now" : undefined
                }
              >
                <b>Brand kit</b>
                <span>
                  {kit?.signed_off_at
                    ? `Signed off ${dayLabel(kit.signed_off_at.slice(0, 10))}`
                    : "In design"}
                </span>
              </div>
              <div
                className={
                  stage === "content" && client?.status === "active"
                    ? "now"
                    : undefined
                }
              >
                <b>Monthly content</b>
                <span>{monthsIn ? `Month ${monthsIn}` : "After sign-off"}</span>
              </div>
              <div>
                <b>Review &amp; renew</b>
                <span>With your account executive</span>
              </div>
            </div>
            <div className="plist" style={{ marginTop: 18 }}>
              <div>
                <span>Your account executive</span>
                <b>{client?.account_exec_name ?? "—"}</b>
              </div>
              <div>
                <span>Plan</span>
                <b>
                  {client?.service_name ?? "—"}
                  {client?.monthly_fee
                    ? ` · ${formatMoney(client.monthly_fee)}/month`
                    : ""}
                </b>
              </div>
              <div>
                <span>Platforms</span>
                <b>
                  {(client?.platforms ?? [])
                    .map((p) => p[0].toUpperCase() + p.slice(1))
                    .join(" + ") || "—"}
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
