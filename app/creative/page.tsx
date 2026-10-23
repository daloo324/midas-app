import type { Metadata } from "next";
import Link from "next/link";
import { hm } from "@/lib/creative/time-format";
import {
  WORK_STATUSES,
  WORK_STATUS_COLOR,
  WORK_STATUS_LABELS,
  monthLabel,
} from "@/lib/content/constants";
import { COLOR_ROLES, KIT_TOTAL } from "@/lib/creative/constants";
import { listStudioCards } from "@/lib/data/creative";
import { todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Design clients" };

export default async function StudioHome() {
  const month = `${todayInGaborone().slice(0, 7)}-01`;
  const cards = await listStudioCards(month);
  return (
    <>
      <div className="head">
        <div>
          <h1>Design clients</h1>
          <p className="sub">
            {monthLabel(month)}. Every client, so you can learn from each
            other&apos;s work. Open one for its brief, brand kit and weekly
            board.
          </p>
        </div>
      </div>
      {cards.length === 0 ? (
        <div className="empty-state">
          <h2>No clients yet</h2>
          <p>Clients appear here as soon as the CEO adds them.</p>
        </div>
      ) : (
        <div className="cgrid">
          {cards.map((c) => {
            const signedOff = c.kit.status === "approved";
            return (
              <Link
                key={c.id}
                className="ccard"
                href={`/creative/clients/${c.id}/${signedOff ? "board" : "kit"}`}
              >
                <div className="swatches">
                  {COLOR_ROLES.map((r) => (
                    <i
                      key={r.key}
                      style={{
                        background: c.kit.colors[r.key] ?? "var(--line)",
                      }}
                    />
                  ))}
                </div>
                <div>
                  <h3 style={{ fontSize: 17 }}>{c.name}</h3>
                  <div className="meta">
                    {c.industry ?? ""}
                    {c.kit.heading_font
                      ? ` · ${c.kit.heading_font} + ${c.kit.body_font ?? ""}`
                      : ""}
                  </div>
                </div>
                {!signedOff ? (
                  <div className="kv">
                    <span>Brand kit</span>
                    <span>{WORK_STATUS_LABELS[c.kit.status]}</span>
                    <span>Kit items ready</span>
                    <span>
                      {c.kit.ready} / {KIT_TOTAL}
                    </span>
                    <span>Content creation</span>
                    <span>Locked until sign-off</span>
                  </div>
                ) : !c.month ? (
                  <div className="notice">
                    {monthLabel(month)} isn&apos;t planned yet
                  </div>
                ) : (
                  <>
                    <div className="bar">
                      {WORK_STATUSES.map((s) =>
                        c.month!.byStatus[s] ? (
                          <i
                            key={s}
                            style={{
                              width: `${(c.month!.byStatus[s]! / c.month!.total) * 100}%`,
                              background: WORK_STATUS_COLOR[s],
                            }}
                          />
                        ) : null,
                      )}
                    </div>
                    <div className="kv">
                      <span>Done</span>
                      <span>
                        {c.month.done} / {c.month.total}
                      </span>
                      <span>Time logged this month</span>
                      <span>{hm(c.month.minutes)}</span>
                      <span>Calendar</span>
                      <span>
                        {c.month.planStatus === "approved"
                          ? "Approved"
                          : "Waiting for client approval"}
                      </span>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
