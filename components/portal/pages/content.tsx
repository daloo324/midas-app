import Link from "next/link";
import { monthLabel, monthParam, shiftMonth } from "@/lib/content/constants";
import { weeksOfMonth } from "@/lib/creative/weeks";
import { monthItems, type PortalItem } from "@/lib/data/portal";
import { CLIENT_STATUS, FORMAT_LABEL } from "@/lib/portal/labels";
import type { Viewer } from "@/lib/portal/viewer";
import { dayLabel } from "@/lib/content/constants";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "post", label: "Post" },
  { key: "story", label: "Story" },
  { key: "reel", label: "Reel" },
  { key: "published", label: "Published" },
  { key: "scheduled", label: "Scheduled" },
  { key: "client_review", label: "Waiting for you" },
] as const;

function matches(i: PortalItem, f: string) {
  if (f === "all") return true;
  if (f === "post" || f === "story" || f === "reel") return i.format === f;
  return i.status === f;
}

export async function ContentPage({
  viewer,
  month,
  filter,
}: {
  viewer: Viewer;
  month: string;
  filter: string;
}) {
  const f = FILTERS.some((x) => x.key === filter) ? filter : "all";
  const items = (await monthItems(viewer.clientId, month)).filter((i) =>
    matches(i, f),
  );
  const weeks = weeksOfMonth(month)
    .map((w) => ({
      ...w,
      items: items.filter(
        (i) =>
          i.scheduled_date &&
          i.scheduled_date >= w.start &&
          i.scheduled_date <= w.end,
      ),
    }))
    .filter((w) => w.items.length);
  const undated = items.filter((i) => !i.scheduled_date);
  const q = (m: string, fl: string) =>
    `${viewer.base}/content?month=${monthParam(m)}${fl !== "all" ? `&filter=${fl}` : ""}`;

  return (
    <>
      <div className="head">
        <div>
          <h1>Content · {monthLabel(month)}</h1>
          <p className="sub">
            Every post, story and reel this month that&apos;s reached you, and
            where each one is. Open a piece to see it with its caption.
          </p>
        </div>
        <div className="month-pick">
          <Link href={q(shiftMonth(month, -1), f)} aria-label="Previous month">
            ‹
          </Link>
          <b>{monthLabel(month)}</b>
          <Link href={q(shiftMonth(month, 1), f)} aria-label="Next month">
            ›
          </Link>
        </div>
      </div>
      <div className="filters">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            className="chip"
            href={q(month, x.key)}
            aria-current={f === x.key ? "page" : undefined}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {weeks.length === 0 && undated.length === 0 ? (
        <p className="sub" style={{ marginTop: 18 }}>
          {f === "all"
            ? "Nothing has reached you for this month yet."
            : "Nothing matches that filter."}
        </p>
      ) : null}
      {weeks.map((w) => (
        <section key={w.start}>
          <div className="weekhead">
            <h2>
              Week of{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${w.start}T00:00:00Z`))}
            </h2>
            <span className="sub">
              {w.items.filter((i) => i.status === "published").length} of{" "}
              {w.items.length} published
            </span>
          </div>
          <Cards items={w.items} base={viewer.base} />
        </section>
      ))}
      {undated.length ? (
        <section>
          <div className="weekhead">
            <h2>Campaign ads</h2>
          </div>
          <Cards items={undated} base={viewer.base} />
        </section>
      ) : null}
    </>
  );
}

function Cards({ items, base }: { items: PortalItem[]; base: string }) {
  return (
    <div className="posts">
      {items.map((i) => (
        <Link key={i.id} className="post" href={`${base}/content/${i.id}`}>
          <div
            className={
              i.format === "post" || i.format === "ad_feed"
                ? "pimg"
                : "pimg story"
            }
          >
            {i.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img src={i.previewUrl} alt="" />
            ) : (
              <span className="sub">No preview</span>
            )}
          </div>
          <div className="meta">
            <b>{i.topic ?? i.slot_code}</b>
            <span className="sub" style={{ margin: 0 }}>
              {dayLabel(i.scheduled_date)} · {FORMAT_LABEL[i.format]}
            </span>
            <span
              className={`pill ${CLIENT_STATUS[i.status]?.pill ?? ""}`}
              style={{ justifySelf: "start" }}
            >
              {CLIENT_STATUS[i.status]?.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
