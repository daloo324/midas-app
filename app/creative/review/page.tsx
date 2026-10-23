import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { dayLabel, monthParam } from "@/lib/content/constants";
import { reviewQueue } from "@/lib/data/creative";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Review" };

const FORMAT: Record<string, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  ad_feed: "Feed ad",
  ad_story: "Story ad",
  ad_variant: "Test variant",
};

// The creative director's queue: everything in internal review, oldest first.
export default async function ReviewPage() {
  const user = await requireArea("creative");
  if (user.role === "designer") redirect("/creative");
  const { items, kits } = await reviewQueue();
  const total = items.length + kits.length;
  return (
    <>
      <div className="head">
        <div>
          <h1>Review</h1>
          <p className="sub">
            Work waiting for the creative director, oldest first. Only you can
            send it to the client.
          </p>
        </div>
        <span className={`pill ${total ? "s-warn" : "s-good"}`}>
          {total} waiting
        </span>
      </div>
      {total === 0 ? (
        <div className="empty-state">
          <h2>Nothing to review</h2>
          <p>
            Items appear here when a designer sends them for internal review.
          </p>
        </div>
      ) : (
        <div
          className="tbl-wrap"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
          }}
        >
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Item</th>
                <th>Due</th>
                <th>Waiting since</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {kits.map((k) => (
                <tr key={k.clientId}>
                  <td>{k.clientName}</td>
                  <td>
                    <b>Brand kit</b>
                  </td>
                  <td>—</td>
                  <td>{formatDateTime(k.since)}</td>
                  <td>
                    <Link
                      className="btn sm"
                      href={`/creative/clients/${k.clientId}/kit`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.clientName}</td>
                  <td>
                    <b>{i.slot_code}</b> · {FORMAT[i.format] ?? i.format}
                    {i.topic ? ` · ${i.topic}` : ""}
                  </td>
                  <td>{dayLabel(i.scheduled_date)}</td>
                  <td>{formatDateTime(i.updated_at)}</td>
                  <td>
                    <Link
                      className="btn sm"
                      href={`/creative/clients/${i.clientId}/board?month=${monthParam(i.month)}#${i.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
