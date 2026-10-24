"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveLeadAction } from "@/app/admin/sales/actions";
import { useReport } from "@/components/shared/toast";
import { cx } from "@/lib/cx";
import { formatDay, formatMoney } from "@/lib/format";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LOST_REASONS,
  LOST_REASON_LABELS,
  type LeadStage,
  type LostReason,
} from "@/lib/format/status";

export type BoardLead = {
  id: string;
  company: string;
  contact_name: string | null;
  estimated_value: number | null;
  owner: string | null;
  next_action: string | null;
  next_action_date: string | null;
  stage: LeadStage;
  lost_reason: LostReason | null;
  client_id: string | null;
};

/**
 * The pipeline: drag a card between columns, or use its status menu (phones).
 * Moving to Lost asks for a reason; moving to Won opens the lead to create the client.
 */
export function SalesBoard({
  leads,
  today,
}: {
  leads: BoardLead[];
  today: string;
}) {
  const [over, setOver] = useState<LeadStage | null>(null);
  const [losing, setLosing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const report = useReport();
  const router = useRouter();

  const move = (id: string, stage: LeadStage, lostReason?: LostReason) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    if (stage === "lost" && !lostReason) {
      setLosing(id);
      return;
    }
    start(async () => {
      const r = await moveLeadAction({
        id,
        stage,
        lostReason: lostReason ?? null,
      });
      if (report(r)) {
        setLosing(null);
        if (stage === "won" && !lead.client_id)
          router.push(`/admin/sales/${id}#win`);
      }
    });
  };

  return (
    <div className="pipeline-wrap">
      <div className="pipeline" aria-busy={pending}>
        {LEAD_STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage);
          const total = col.reduce((a, l) => a + (l.estimated_value ?? 0), 0);
          return (
            <section
              key={stage}
              className={cx("pcol", over === stage && "over")}
              aria-label={LEAD_STAGE_LABELS[stage]}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                move(e.dataTransfer.getData("text/plain"), stage);
              }}
            >
              <header className="row between">
                <h3>
                  {LEAD_STAGE_LABELS[stage]}{" "}
                  <span className="sub">{col.length}</span>
                </h3>
                <span className="sub">{formatMoney(total)}</span>
              </header>
              {col.map((l) => {
                const overdue =
                  !!l.next_action_date &&
                  l.next_action_date < today &&
                  stage !== "won" &&
                  stage !== "lost";
                return (
                  <article
                    key={l.id}
                    className="pcard"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", l.id)
                    }
                  >
                    <Link href={`/admin/sales/${l.id}`} className="pname">
                      {l.company}
                    </Link>
                    <div className="sub">
                      {[l.contact_name, l.owner && `Owner: ${l.owner}`]
                        .filter(Boolean)
                        .join(" · ") || "No contact yet"}
                    </div>
                    <div className="num" style={{ fontSize: 15 }}>
                      {formatMoney(l.estimated_value)}
                    </div>
                    {l.next_action || l.next_action_date ? (
                      <div className={cx("pnext", overdue && "late")}>
                        {l.next_action ?? "Next action"}
                        {l.next_action_date
                          ? ` · ${formatDay(l.next_action_date)}`
                          : ""}
                        {overdue ? " · overdue" : ""}
                      </div>
                    ) : null}
                    {l.stage === "lost" && l.lost_reason ? (
                      <div className="sub">
                        Lost: {LOST_REASON_LABELS[l.lost_reason]}
                      </div>
                    ) : null}
                    <select
                      className="field"
                      value={l.stage}
                      disabled={pending}
                      aria-label={`Stage for ${l.company}`}
                      onChange={(e) => move(l.id, e.target.value as LeadStage)}
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {LEAD_STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {losing === l.id ? (
                      <div
                        className="lost-ask"
                        role="group"
                        aria-label="Why was it lost?"
                      >
                        <b>Why was it lost?</b>
                        <div className="chips">
                          {LOST_REASONS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              className="chip"
                              disabled={pending}
                              onClick={() => move(l.id, "lost", r)}
                            >
                              {LOST_REASON_LABELS[r]}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="chip"
                            onClick={() => setLosing(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
