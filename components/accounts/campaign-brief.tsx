"use client";

import { useState, useTransition } from "react";
import {
  campaignStatusAction,
  createCampaignAction,
  saveCampaignAction,
} from "@/app/accounts/actions";
import {
  AD_SLOTS,
  CAMPAIGN_PARTS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_PILL,
  LAUNCH_CHECKS,
  WORK_STATUS_LABELS,
  WORK_STATUS_PILL,
  type CampaignField,
  type WorkStatus,
} from "@/lib/content/constants";
import type { DeskCampaign } from "@/lib/data/accounts";
import { AutoSelect, AutoText } from "@/components/shared/auto-field";
import { useReport } from "@/components/shared/toast";
import { cx } from "@/lib/cx";

function valueOf(
  c: DeskCampaign,
  key: CampaignField["key"],
): string | number | null {
  const [group, sub] = key.split(".");
  if (sub)
    return (c[group as "audience" | "message" | "launch"] ?? {})[sub] ?? null;
  return c[group as keyof DeskCampaign] as string | number | null;
}

export function CreateCampaignButton({ monthId }: { monthId: string }) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn pri"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => void report(await createCampaignAction(monthId)))
      }
    >
      {pending ? "Creating…" : "Create this month's campaign"}
    </button>
  );
}

export function CampaignBrief({
  campaign: c,
  ads,
}: {
  campaign: DeskCampaign;
  ads: { slot: string; status: WorkStatus }[];
}) {
  const locked = c.status === "complete";
  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: "1 1 320px" }}>
            <h2>Campaign ad set brief</h2>
            <p className="sub">
              One campaign per month: a promotion, launch or seasonal push. Ad
              budget is separate and paid by the client.
            </p>
            <label className="f" style={{ marginTop: 12, maxWidth: 420 }}>
              Campaign name
              <AutoText
                type="text"
                value={c.name}
                disabled={locked}
                onSave={(v) => saveCampaignAction(c.id, "name", v)}
              />
            </label>
          </div>
          <StatusControls campaign={c} />
        </div>
      </div>
      <div className="stack">
        {CAMPAIGN_PARTS.map((p, i) => (
          <section className="part" key={p.key}>
            <header>
              <em>{i + 1}</em>
              <div>
                <h3>{p.title}</h3>
                <p>
                  {p.d} <b>Deliverable:</b> {p.deliverable}.
                </p>
              </div>
            </header>
            <div className="body">
              <div className="fgrid">
                {p.fields.map((f) => (
                  <label
                    key={f.key}
                    className={cx(
                      "f",
                      (f.full || f.type === "textarea") && "full",
                    )}
                  >
                    {f.label}
                    <Field
                      field={f}
                      value={valueOf(c, f.key)}
                      disabled={locked && f.key !== "results"}
                      onSave={(v) => saveCampaignAction(c.id, f.key, v)}
                    />
                  </label>
                ))}
              </div>
              {p.ads ? (
                <div className="deliv">
                  {AD_SLOTS.map((a) => {
                    const status =
                      ads.find((x) => x.slot === a.slot)?.status ?? "planned";
                    return (
                      <div key={a.slot}>
                        <span>
                          {a.slot} · {a.label}
                        </span>
                        <span className={`pill ${WORK_STATUS_PILL[status]}`}>
                          {WORK_STATUS_LABELS[status]}
                        </span>
                      </div>
                    );
                  })}
                  <p className="sub" style={{ fontSize: 13, margin: 0 }}>
                    The ads move through design in the calendar like any other
                    item.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Field({
  field: f,
  value,
  disabled,
  onSave,
}: {
  field: CampaignField;
  value: string | number | null;
  disabled: boolean;
  onSave: (v: string) => ReturnType<typeof saveCampaignAction>;
}) {
  if (f.type === "select") {
    return (
      <AutoSelect
        value={value == null ? "" : String(value)}
        options={f.options!}
        placeholder="Choose…"
        disabled={disabled}
        onSave={onSave}
      />
    );
  }
  return (
    <AutoText
      value={value}
      type={f.type === "textarea" ? "text" : f.type}
      multiline={f.type === "textarea"}
      placeholder={f.placeholder}
      min={f.type === "number" ? 0 : undefined}
      step={f.type === "number" ? "any" : undefined}
      disabled={disabled}
      onSave={onSave}
    />
  );
}

function StatusControls({ campaign: c }: { campaign: DeskCampaign }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [ticked, setTicked] = useState<boolean[]>(
    LAUNCH_CHECKS.map(() => false),
  );
  const report = useReport();
  const move = (
    status: "sent" | "live" | "complete" | "draft",
    checks = false,
  ) =>
    start(async () => {
      if (
        report(await campaignStatusAction({ campaignId: c.id, status, checks }))
      )
        setConfirming(false);
    });

  return (
    <div
      style={{ display: "grid", gap: 8, justifyItems: "end", minWidth: 220 }}
    >
      <span className={`pill ${CAMPAIGN_STATUS_PILL[c.status]}`}>
        {CAMPAIGN_STATUS_LABELS[c.status]}
      </span>
      {c.status === "draft" ? (
        <button
          className="btn pri"
          type="button"
          disabled={pending}
          onClick={() => move("sent")}
        >
          Send to client
        </button>
      ) : null}
      {c.status === "sent" ? (
        <>
          <span className="sub" style={{ margin: 0, fontSize: 13 }}>
            Waiting for the client to approve.
          </span>
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={() => move("draft")}
          >
            Take back to draft
          </button>
        </>
      ) : null}
      {c.status === "approved" && !confirming ? (
        <button
          className="btn pri"
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          Mark live
        </button>
      ) : null}
      {c.status === "live" ? (
        <button
          className="btn pri"
          type="button"
          disabled={pending}
          onClick={() => move("complete")}
        >
          Mark complete
        </button>
      ) : null}
      {confirming ? (
        <div
          className="notice"
          style={{ display: "grid", gap: 8, textAlign: "left" }}
        >
          <b style={{ color: "var(--ink)" }}>
            Before the ads go live, confirm:
          </b>
          {LAUNCH_CHECKS.map((label, i) => (
            <label
              key={label}
              className="row"
              style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-start" }}
            >
              <input
                type="checkbox"
                checked={ticked[i]}
                onChange={(e) =>
                  setTicked((t) =>
                    t.map((x, j) => (j === i ? e.target.checked : x)),
                  )
                }
              />
              <span>{label}</span>
            </label>
          ))}
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn sm pri"
              type="button"
              disabled={pending || !ticked.every(Boolean)}
              onClick={() => move("live", true)}
            >
              It&apos;s live
            </button>
            <button
              className="btn sm"
              type="button"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
