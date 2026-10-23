"use client";

import { useState, useTransition } from "react";
import {
  moveItemAction,
  saveItemAction,
  sendCalendarAction,
} from "@/app/accounts/actions";
import {
  FORMAT_GROUPS,
  ITEM_PLATFORMS,
  ITEM_PLATFORM_LABELS,
  PILLAR_LABELS,
  POST_PILLARS,
  WORK_STATUS_LABELS,
  WORK_STATUS_PILL,
  type ItemPlatform,
} from "@/lib/content/constants";
import type { DeskItem } from "@/lib/data/accounts";
import { AutoSelect, AutoText } from "@/components/shared/auto-field";
import { useReport } from "@/components/shared/toast";

const pillarOptions = POST_PILLARS.map((p) => ({
  value: p,
  label: PILLAR_LABELS[p],
}));

export function CalendarTable({
  items,
  month,
  platforms,
}: {
  items: DeskItem[];
  month: string;
  platforms: string[];
}) {
  const monthEnd = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  // The client's platforms first, then whatever an item already uses.
  const platformOptions = (["both", ...platforms] as string[])
    .filter((p): p is ItemPlatform =>
      (ITEM_PLATFORMS as readonly string[]).includes(p),
    )
    .map((p) => ({ value: p, label: ITEM_PLATFORM_LABELS[p] }));
  const groups = [
    ...FORMAT_GROUPS,
    { format: "ad" as const, label: "Campaign ads" },
  ];

  return (
    <div
      className="tbl-wrap"
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "var(--surface)",
      }}
    >
      <table className="cal">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Date</th>
            <th>Pillar</th>
            <th>Topic</th>
            <th>Platform</th>
            <th>Notes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const rows = items.filter((i) =>
              g.format === "ad"
                ? i.slot_code.startsWith("A")
                : i.format === g.format,
            );
            if (!rows.length) return null;
            return [
              <tr className="grp" key={g.format}>
                <td colSpan={7}>
                  {g.label} · {rows.length}
                </td>
              </tr>,
              ...rows.map((i) => (
                <Row
                  key={i.id}
                  item={i}
                  month={month}
                  monthEnd={monthEnd}
                  platformOptions={
                    platformOptions.some((o) => o.value === i.platform)
                      ? platformOptions
                      : [
                          ...platformOptions,
                          {
                            value: i.platform,
                            label:
                              ITEM_PLATFORM_LABELS[
                                i.platform as ItemPlatform
                              ] ?? i.platform,
                          },
                        ]
                  }
                />
              )),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  item: i,
  month,
  monthEnd,
  platformOptions,
}: {
  item: DeskItem;
  month: string;
  monthEnd: string;
  platformOptions: { value: string; label: string }[];
}) {
  const ad = i.slot_code.startsWith("A");
  const save = (field: string) => (value: string) =>
    saveItemAction(i.id, field, value);
  return (
    <tr data-st={i.status} id={i.id}>
      <td className="slotid">{i.slot_code}</td>
      <td style={{ width: 150 }}>
        {ad ? (
          <span className="sub" style={{ margin: 0 }}>
            {i.scheduled_date ? i.scheduled_date : "From the brief"}
          </span>
        ) : (
          <AutoText
            type="date"
            value={i.scheduled_date}
            min={month}
            max={monthEnd}
            onSave={save("scheduled_date")}
            aria-label={`${i.slot_code} date`}
          />
        )}
      </td>
      <td style={{ width: 170 }}>
        {ad ? (
          PILLAR_LABELS.campaign
        ) : (
          <AutoSelect
            value={i.pillar}
            options={pillarOptions}
            onSave={save("pillar")}
            aria-label={`${i.slot_code} pillar`}
          />
        )}
      </td>
      <td>
        <AutoText
          type="text"
          value={i.topic}
          placeholder="Topic or hook"
          onSave={save("topic")}
          aria-label={`${i.slot_code} topic`}
        />
      </td>
      <td style={{ width: 130 }}>
        <AutoSelect
          value={i.platform}
          options={platformOptions}
          onSave={save("platform")}
          aria-label={`${i.slot_code} platform`}
        />
      </td>
      <td style={{ width: 200 }}>
        <AutoText
          type="text"
          value={i.notes}
          placeholder="Notes for design"
          onSave={save("notes")}
          aria-label={`${i.slot_code} notes`}
        />
      </td>
      <td style={{ width: 190 }}>
        <StatusCell item={i} />
      </td>
    </tr>
  );
}

/** Status is read-only here, apart from the account exec's own moves. */
function StatusCell({ item: i }: { item: DeskItem }) {
  const [pending, start] = useTransition();
  const [recording, setRecording] = useState(false);
  const [decision, setDecision] = useState<"approved" | "changes_requested">(
    "approved",
  );
  const [note, setNote] = useState("");
  const report = useReport();
  const move = (
    status: "approved" | "changes_requested" | "scheduled" | "published",
    withNote?: string,
  ) =>
    start(async () => {
      if (
        report(
          await moveItemAction({ itemId: i.id, status, note: withNote ?? "" }),
        )
      )
        setRecording(false);
    });

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span className={`pill ${WORK_STATUS_PILL[i.status]}`}>
        {WORK_STATUS_LABELS[i.status]}
      </span>
      {i.status === "approved" ? (
        <button
          className="btn sm"
          type="button"
          disabled={pending}
          onClick={() => move("scheduled")}
        >
          Mark scheduled
        </button>
      ) : null}
      {i.status === "scheduled" ? (
        <button
          className="btn sm"
          type="button"
          disabled={pending}
          onClick={() => move("published")}
        >
          Mark published
        </button>
      ) : null}
      {i.status === "client_review" && !recording ? (
        <button
          className="link"
          type="button"
          onClick={() => setRecording(true)}
        >
          Record the client&apos;s answer
        </button>
      ) : null}
      {recording ? (
        <form
          style={{ display: "grid", gap: 6 }}
          onSubmit={(e) => {
            e.preventDefault();
            move(decision, note);
          }}
        >
          <select
            className="field"
            value={decision}
            onChange={(e) => setDecision(e.target.value as typeof decision)}
            aria-label={`${i.slot_code} client's answer`}
          >
            <option value="approved">Client approved</option>
            <option value="changes_requested">Client asked for changes</option>
          </select>
          <input
            className="field"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            placeholder="How they told you, e.g. WhatsApp, 3 Nov"
            aria-label={`${i.slot_code} note`}
          />
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn sm pri"
              type="submit"
              disabled={pending || !note.trim()}
            >
              Save
            </button>
            <button
              className="btn sm"
              type="button"
              onClick={() => setRecording(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function SendCalendarButton({
  monthId,
  missing,
}: {
  monthId: string;
  missing: number;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn pri"
      type="button"
      disabled={pending || missing > 0}
      title={
        missing
          ? `Give every slot a topic first (${missing} still empty).`
          : undefined
      }
      onClick={() =>
        start(async () => void report(await sendCalendarAction(monthId)))
      }
    >
      {pending ? "Sending…" : "Send to client for approval"}
    </button>
  );
}
