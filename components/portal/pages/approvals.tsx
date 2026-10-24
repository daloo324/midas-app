import {
  respondToBriefAction,
  respondToCalendarAction,
  respondToItemAction,
  respondToKitAction,
} from "@/app/portal/actions";
import { PILLAR_LABELS, dayLabel, monthLabel } from "@/lib/content/constants";
import type {
  Approval,
  BriefApproval,
  CalendarApproval,
  ItemApproval,
  KitApproval,
} from "@/lib/data/portal";
import { listApprovals } from "@/lib/data/portal";
import { formatDay, formatMoney } from "@/lib/format";
import { FORMAT_LABEL, longDay } from "@/lib/portal/labels";
import type { Viewer } from "@/lib/portal/viewer";
import { ApprovalActions } from "../approval-actions";
import { Colours, MarkGrid } from "../kit-view";

export async function ApprovalsPage({ viewer }: { viewer: Viewer }) {
  const list = await listApprovals(viewer.clientId);
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
            <Row key={keyOf(a)} a={a} readOnly={viewer.readOnly} />
          ))
        )}
      </div>
    </>
  );
}

function keyOf(a: Approval) {
  return a.kind === "item"
    ? a.id
    : a.kind === "calendar"
      ? a.monthId
      : a.kind === "brief"
        ? a.campaignId
        : "kit";
}

function Row({ a, readOnly }: { a: Approval; readOnly: boolean }) {
  if (a.kind === "item") return <ItemRow a={a} readOnly={readOnly} />;
  if (a.kind === "calendar") return <CalendarRow a={a} readOnly={readOnly} />;
  if (a.kind === "brief") return <BriefRow a={a} readOnly={readOnly} />;
  return <KitRow a={a} readOnly={readOnly} />;
}

function Waiting({ title }: { title: string }) {
  return (
    <div className="row between">
      <h3>{title}</h3>
      <span className="pill s-warn">Waiting for you</span>
    </div>
  );
}

function ItemRow({ a, readOnly }: { a: ItemApproval; readOnly: boolean }) {
  return (
    <div className="approve" id={a.id}>
      <div
        style={{
          maxWidth: 260,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
        }}
      >
        {a.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img
            src={a.previewUrl}
            alt={`Preview of ${a.slot_code}`}
            style={{ width: "100%", display: "block" }}
          />
        ) : (
          <p className="sub" style={{ padding: 20, margin: 0 }}>
            No preview
          </p>
        )}
      </div>
      <div>
        <Waiting
          title={`${a.slot_code} · ${a.topic ?? FORMAT_LABEL[a.format]}`}
        />
        <p className="sub">
          {FORMAT_LABEL[a.format]} · {PILLAR_LABELS[a.pillar]} ·{" "}
          {a.scheduled_date
            ? `goes live ${longDay(a.scheduled_date)}`
            : "goes live with the campaign"}
        </p>
        {a.revision_rounds >= 1 ? (
          <p className="sub" style={{ color: "var(--warn)" }}>
            Updated after your changes.
          </p>
        ) : null}
        {a.graphic_copy ? (
          <>
            <div className="label" style={{ marginTop: 12 }}>
              Words on the design
            </div>
            <div className="cap" style={{ marginTop: 6 }}>
              {a.graphic_copy}
            </div>
          </>
        ) : null}
        <div className="label" style={{ marginTop: 12 }}>
          Caption
        </div>
        <div className="cap" style={{ marginTop: 6 }}>
          {a.caption || "No caption"}
        </div>
        {a.hashtags ? (
          <p className="sub" style={{ marginTop: 8 }}>
            {a.hashtags}
          </p>
        ) : null}
        <ApprovalActions
          id={a.id}
          respond={respondToItemAction}
          undo={{ entityType: "content_item", id: a.id }}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function CalendarRow({
  a,
  readOnly,
}: {
  a: CalendarApproval;
  readOnly: boolean;
}) {
  return (
    <div className="approve">
      <div className="panel" style={{ background: "var(--surface-2)" }}>
        <div className="label">Content plan</div>
        <div className="big" style={{ fontSize: 22, marginTop: 6 }}>
          {a.rows.length} pieces
        </div>
        <p className="sub">Approve by {dayLabel(a.due)}</p>
      </div>
      <div>
        <Waiting title={`${monthLabel(a.month)} content calendar`} />
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
                  <td>{FORMAT_LABEL[r.format]}</td>
                  <td>{PILLAR_LABELS[r.pillar]}</td>
                  <td>{r.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ApprovalActions
          id={a.monthId}
          respond={respondToCalendarAction}
          undo={{ entityType: "content_month", id: a.monthId }}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function BriefRow({ a, readOnly }: { a: BriefApproval; readOnly: boolean }) {
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
        <p className="sub">Approve by {dayLabel(a.due)}</p>
      </div>
      <div>
        <Waiting title={a.name || `${monthLabel(a.month)} campaign`} />
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
        <ApprovalActions
          id={a.campaignId}
          respond={respondToBriefAction}
          undo={{ entityType: "campaign", id: a.campaignId }}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function KitRow({ a, readOnly }: { a: KitApproval; readOnly: boolean }) {
  const kit = a.kit;
  const guide = kit.files.find((f) => f.slot === "guide_pdf");
  return (
    <div className="approve">
      <div className="panel" style={{ background: "var(--surface-2)" }}>
        <div className="label">Brand kit</div>
        <div className="big" style={{ fontSize: 22, marginTop: 6 }}>
          Your brand
        </div>
        <p className="sub">Signing it off opens your monthly content.</p>
      </div>
      <div>
        <Waiting title="Your brand kit" />
        <p className="sub">
          Your logo, icon, colours and fonts. Once you sign it off, the files
          move to Brand assets for you to download.
        </p>
        <h3 style={{ margin: "14px 0 8px" }}>Logo</h3>
        <MarkGrid kit={kit} prefix="logo" downloads={false} />
        <h3 style={{ margin: "14px 0 8px" }}>Icon</h3>
        <MarkGrid kit={kit} prefix="icon" downloads={false} />
        <h3 style={{ margin: "14px 0 8px" }}>Colours</h3>
        <Colours kit={kit} />
        <div className="kv" style={{ marginTop: 12 }}>
          <span>Heading font</span>
          <span>{kit.heading_font ?? "—"}</span>
          <span>Body font</span>
          <span>{kit.body_font ?? "—"}</span>
        </div>
        {guide?.url ? (
          <p style={{ marginTop: 10 }}>
            <a
              className="link"
              href={guide.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the brand guide (PDF)
            </a>
          </p>
        ) : null}
        <ApprovalActions
          id={kit.clientId}
          respond={respondToKitAction}
          undo={{ entityType: "brand_kit", id: kit.id }}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
