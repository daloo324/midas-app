import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ITEM_PLATFORM_LABELS,
  PILLAR_LABELS,
  monthParam,
  type ItemPlatform,
} from "@/lib/content/constants";
import { getPortalClient, itemDetail } from "@/lib/data/portal";
import { formatDateTime } from "@/lib/format";
import { CLIENT_STATUS, FORMAT_LABEL, longDay } from "@/lib/portal/labels";
import type { Viewer } from "@/lib/portal/viewer";
import { uuid } from "@/lib/validation/accounts";

export async function ContentItemPage({
  viewer,
  itemId,
}: {
  viewer: Viewer;
  itemId: string;
}) {
  if (!uuid.safeParse(itemId).success) notFound();
  const [detail, client] = await Promise.all([
    itemDetail(viewer.clientId, itemId),
    getPortalClient(viewer.clientId),
  ]);
  if (!detail) notFound();
  const { item, history, comments } = detail;
  const platforms =
    item.platform === "both"
      ? (client?.platforms ?? [])
          .map((p) => p[0].toUpperCase() + p.slice(1))
          .join(" + ")
      : (ITEM_PLATFORM_LABELS[item.platform as ItemPlatform] ?? item.platform);
  return (
    <>
      <div className="crumbs">
        <Link
          className="link"
          href={`${viewer.base}/content?month=${monthParam(item.month!)}`}
        >
          Content
        </Link>{" "}
        / {item.slot_code}
      </div>
      <div className="head">
        <div>
          <h1>
            {item.slot_code} · {item.topic ?? FORMAT_LABEL[item.format!]}
          </h1>
          <p className="sub">
            {FORMAT_LABEL[item.format!]} · {PILLAR_LABELS[item.pillar!]} ·{" "}
            {item.scheduled_date
              ? longDay(item.scheduled_date)
              : "with the campaign"}{" "}
            · {platforms}
          </p>
        </div>
        <span className={`pill ${CLIENT_STATUS[item.status!]?.pill ?? ""}`}>
          {CLIENT_STATUS[item.status!]?.label}
        </span>
      </div>
      <div className="g2">
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img
              src={item.previewUrl}
              alt={`Preview of ${item.slot_code}`}
              style={{ width: "100%", display: "block" }}
            />
          ) : (
            <p className="sub" style={{ padding: 20 }}>
              No preview yet.
            </p>
          )}
        </div>
        <div className="stack">
          <section className="panel">
            {item.graphic_copy ? (
              <>
                <div className="label">Words on the design</div>
                <div className="cap" style={{ marginTop: 6 }}>
                  {item.graphic_copy}
                </div>
              </>
            ) : null}
            <div
              className="label"
              style={{ marginTop: item.graphic_copy ? 12 : 0 }}
            >
              Caption
            </div>
            <div className="cap" style={{ marginTop: 6 }}>
              {item.caption || "No caption"}
            </div>
            {item.hashtags ? (
              <p className="sub" style={{ marginTop: 8 }}>
                {item.hashtags}
              </p>
            ) : null}
            {item.status === "client_review" ? (
              <Link
                className="btn pri"
                href={`${viewer.base}/approvals#${item.id}`}
                style={{ marginTop: 12 }}
              >
                Review in Approvals
              </Link>
            ) : null}
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 8 }}>History</h2>
            <div className="plist">
              {history.map((h, i) => (
                <div key={i}>
                  <span>
                    {CLIENT_STATUS[h.to_status as keyof typeof CLIENT_STATUS]
                      ?.label ?? h.to_status}
                    {h.actor_kind === "client" ? " (you)" : ""}
                  </span>
                  <b style={{ fontWeight: 500 }}>
                    {formatDateTime(h.created_at)}
                  </b>
                </div>
              ))}
            </div>
          </section>
          {comments.length ? (
            <section className="panel">
              <h2 style={{ marginBottom: 8 }}>Comments</h2>
              <div className="plist">
                {comments.map((c, i) => (
                  <div key={i} style={{ display: "block" }}>
                    <b>{c.author_kind === "client" ? "You" : "Midas"}</b>{" "}
                    <span className="sub" style={{ margin: 0 }}>
                      {formatDateTime(c.created_at)}
                    </span>
                    <p style={{ margin: "4px 0 0" }}>{c.body}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
