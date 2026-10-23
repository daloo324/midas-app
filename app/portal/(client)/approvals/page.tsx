import type { Metadata } from "next";
import {
  respondToBriefAction,
  respondToCalendarAction,
} from "@/app/portal/actions";
import { ApprovalActions } from "@/components/portal/approval-actions";
import {
  PILLAR_LABELS,
  dayLabel,
  monthLabel,
  type ItemFormat,
} from "@/lib/content/constants";
import { listApprovals, type Approval } from "@/lib/data/portal";
import { formatDay, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Approvals" };

const FORMAT: Record<ItemFormat, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  ad_feed: "Feed ad",
  ad_story: "Story ad",
  ad_variant: "Test ad",
};

export default async function ApprovalsPage() {
  const list = await listApprovals();
  return (
    <>
      <div className="head">
        <div>
          <h1>Approvals</h1>
          <p className="sub">
            Nothing is posted or launched without your OK. Each piece gets one
            round of changes; Midas replies within 48 hours.
          </p>
        </div>
        <span className={`pill ${list.length ? "s-warn" : "s-good"}`}>
          {list.length} waiting
        </span>
      </div>
      <div className="panel">
        {list.length === 0 ? (
          <p className="sub" style={{ margin: 0 }}>
            You&apos;re all caught up. We&apos;ll let you know when something
            needs your OK.
          </p>
        ) : (
          list.map((a) => (
            <Row key={a.kind === "calendar" ? a.monthId : a.campaignId} a={a} />
          ))
        )}
      </div>
    </>
  );
}

function Row({ a }: { a: Approval }) {
  const due = <p className="sub">Approve by {dayLabel(a.due)}</p>;
  if (a.kind === "calendar") {
    return (
      <div className="approve">
        <div className="panel" style={{ background: "var(--surface-2)" }}>
          <div className="label">Content plan</div>
          <div className="big" style={{ fontSize: 22, marginTop: 6 }}>
            {a.rows.length} pieces
          </div>
          {due}
        </div>
        <div>
          <div className="row between">
            <h3>{monthLabel(a.month)} content calendar</h3>
            <span className="pill s-warn">Waiting for you</span>
          </div>
          <p className="sub">
            20 posts, 4 stories and 2 reels. Approve the plan and our designers
            start on it.
          </p>
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table className="tbl" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Format</th>
                  <th>Pillar</th>
                  <th>Topic</th>
                </tr>
              </thead>
              <tbody>
                {a.rows.map((r) => (
                  <tr key={r.slot_code}>
                    <td>{dayLabel(r.scheduled_date)}</td>
                    <td>{FORMAT[r.format]}</td>
                    <td>{PILLAR_LABELS[r.pillar]}</td>
                    <td>{r.topic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ApprovalActions id={a.monthId} respond={respondToCalendarAction} />
        </div>
      </div>
    );
  }
  const audience = [
    a.audience.location,
    a.audience.age && `ages ${a.audience.age}`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="approve">
      <div className="panel" style={{ background: "var(--surface-2)" }}>
        <div className="label">Campaign brief</div>
        <div className="big" style={{ fontSize: 22, marginTop: 6 }}>
          {a.start_date && a.end_date
            ? `${formatDay(a.start_date)} – ${formatDay(a.end_date)}`
            : monthLabel(a.month)}
        </div>
        {due}
      </div>
      <div>
        <div className="row between">
          <h3>{a.name || `${monthLabel(a.month)} campaign`}</h3>
          <span className="pill s-warn">Waiting for you</span>
        </div>
        <div className="kv" style={{ marginTop: 8 }}>
          <span>Goal</span>
          <span>{a.goal ?? "—"}</span>
          <span>Offer</span>
          <span>{a.offer ?? "—"}</span>
          <span>Audience</span>
          <span>{audience || "—"}</span>
          {a.message.headline_a ? (
            <>
              <span>Headline</span>
              <span>{a.message.headline_a}</span>
            </>
          ) : null}
          <span>Ad budget</span>
          <span>
            {a.ad_budget != null
              ? `${formatMoney(a.ad_budget)} · you pay this to Meta`
              : "—"}
          </span>
          <span>Ads we&apos;ll make</span>
          <span>Feed ad 4:5, story ad 9:16, one test variant</span>
        </div>
        <ApprovalActions id={a.campaignId} respond={respondToBriefAction} />
      </div>
    </div>
  );
}
