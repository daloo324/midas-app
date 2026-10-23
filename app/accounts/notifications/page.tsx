import type { Metadata } from "next";
import Link from "next/link";
import { markNotificationsReadAction } from "@/app/accounts/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { listNotifications } from "@/lib/data/accounts";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { items, unread } = await listNotifications(50);
  return (
    <>
      <div className="home-head">
        <div>
          <h1>Notifications</h1>
          <p className="sub">
            Client approvals and change requests, work reaching the client, and
            questionnaire answers.
          </p>
        </div>
        {unread ? (
          <form action={markNotificationsReadAction}>
            <SubmitButton className="btn" pendingText="Marking…">
              Mark all read
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing yet</h2>
          <p>
            You&apos;ll see a note here when a client approves something, asks
            for changes or sends their questionnaire.
          </p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          {items.map((n, i) => (
            <div
              key={n.id}
              style={{
                padding: "14px 18px",
                borderTop: i ? "1px solid var(--line)" : 0,
                display: "grid",
                gap: 4,
              }}
            >
              <div className="row between">
                <b style={{ fontFamily: "var(--display)" }}>
                  {n.read_at ? null : (
                    <span className="pill s-gold" style={{ marginRight: 8 }}>
                      New
                    </span>
                  )}
                  {n.link ? <Link href={n.link}>{n.title}</Link> : n.title}
                </b>
                <span className="sub" style={{ margin: 0, fontSize: 13 }}>
                  {formatDateTime(n.created_at)}
                </span>
              </div>
              {n.body ? (
                <span className="sub" style={{ margin: 0 }}>
                  {n.body}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
