import type { Metadata } from "next";
import { monthLabel } from "@/lib/content/constants";
import { listPublishedReviews } from "@/lib/data/portal";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Reports & insights" };

// Phase 2 shows the published reviews; Phase 4 adds the reach chart and the
// month's figures (05-portal.md, "Reports and insights").
export default async function ReportsAndInsightsPage() {
  const reviews = await listPublishedReviews();
  return (
    <>
      <div className="head">
        <div>
          <h1>Reports &amp; insights</h1>
          <p className="sub">
            Your monthly review from Midas: what worked, what we&apos;re
            changing, and next month&apos;s focus.
          </p>
        </div>
      </div>
      {reviews.length === 0 ? (
        <div className="panel">
          <p className="sub" style={{ margin: 0 }}>
            Your first monthly review appears here once your account executive
            publishes it.
          </p>
        </div>
      ) : (
        <div className="stack">
          {reviews.map((r) => (
            <section className="panel" key={r.month}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h2>{monthLabel(r.month)} review</h2>
                <span className="sub" style={{ margin: 0, fontSize: 13 }}>
                  Published {formatDay(r.published_at.slice(0, 10))}
                </span>
              </div>
              <div
                className="kv"
                style={{
                  gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)",
                }}
              >
                <span>What worked</span>
                <span style={{ textAlign: "left", fontWeight: 500 }}>
                  {r.working}
                </span>
                <span>What we&apos;re changing</span>
                <span style={{ textAlign: "left", fontWeight: 500 }}>
                  {r.adjust}
                </span>
                {r.top_piece ? (
                  <>
                    <span>Top piece</span>
                    <span style={{ textAlign: "left", fontWeight: 500 }}>
                      {r.top_piece}
                    </span>
                  </>
                ) : null}
                <span>Next month&apos;s focus</span>
                <span style={{ textAlign: "left", fontWeight: 500 }}>
                  {r.focus}
                </span>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
