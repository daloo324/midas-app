"use client";

import { useState, useTransition } from "react";
import { saveProfileAction } from "@/app/accounts/actions";
import {
  BASELINE_FIELDS,
  DEFAULT_MIX,
  EXPECTATIONS,
  PILLAR_HINT,
  PILLAR_LABELS,
  POST_PILLARS,
  type GoalCategory,
} from "@/lib/content/constants";
import type { DeskClient } from "@/lib/data/accounts";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/validation/clients";
import { AutoText } from "@/components/shared/auto-field";
import { useReport } from "@/components/shared/toast";

export function ProfileDetails({ client: c }: { client: DeskClient }) {
  const save = (field: string) => (value: string) =>
    saveProfileAction(c.id, field, value);
  return (
    <div className="fgrid">
      <label className="f">
        Client contact
        <AutoText
          type="text"
          value={c.contact_name}
          placeholder="Name"
          onSave={save("contact_name")}
        />
      </label>
      <label className="f">
        Their role
        <AutoText
          type="text"
          value={c.contact_role}
          placeholder="Owner, manager…"
          onSave={save("contact_role")}
        />
      </label>
      <label className="f">
        Email
        <AutoText
          type="email"
          value={c.contact_email}
          onSave={save("contact_email")}
        />
      </label>
      <label className="f">
        Phone / WhatsApp
        <AutoText
          type="tel"
          value={c.contact_phone}
          onSave={save("contact_phone")}
        />
      </label>
      <label className="f full">
        Signs off content
        <AutoText
          type="text"
          value={c.decision_maker}
          placeholder="Name and role"
          onSave={save("decision_maker")}
        />
      </label>
      <div className="full">
        <div
          className="f"
          style={{
            marginBottom: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          Platforms managed (2 on Brand Launch)
        </div>
        <Platforms clientId={c.id} initial={c.platforms} />
      </div>
    </div>
  );
}

function Platforms({
  clientId,
  initial,
}: {
  clientId: string;
  initial: string[];
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const report = useReport();
  const toggle = (p: string) => {
    const next = on.includes(p) ? on.filter((x) => x !== p) : [...on, p];
    const before = on;
    setOn(next);
    start(async () => {
      if (
        !report(await saveProfileAction(clientId, "platforms", next), {
          quiet: true,
        })
      )
        setOn(before);
    });
  };
  return (
    <>
      <div className="chips">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            className="chip"
            aria-pressed={on.includes(p)}
            disabled={pending}
            onClick={() => toggle(p)}
            style={
              on.includes(p)
                ? {
                    background: "var(--navy)",
                    borderColor: "var(--navy)",
                    color: "var(--on-navy)",
                  }
                : undefined
            }
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>
      {on.length > 2 ? (
        <p className="sub" style={{ fontSize: 13, marginTop: 6 }}>
          Brand Launch covers 2 platforms. More is extra work.
        </p>
      ) : null}
    </>
  );
}

export function PillarMix({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Record<string, number>;
}) {
  const start0 = { ...DEFAULT_MIX, ...initial };
  const [mix, setMix] = useState<Record<string, string>>(
    Object.fromEntries(POST_PILLARS.map((p) => [p, String(start0[p] ?? 0)])),
  );
  const [saved, setSaved] = useState(mix);
  const [pending, start] = useTransition();
  const report = useReport();
  const nums = Object.fromEntries(
    POST_PILLARS.map((p) => [p, Number(mix[p] || 0)]),
  );
  const total = Object.values(nums).reduce((a, b) => a + b, 0);
  const changed = POST_PILLARS.some((p) => mix[p] !== saved[p]);
  return (
    <>
      <p className="sub" style={{ marginBottom: 12 }}>
        Target posts per pillar each month. Used when a new month is started.
        Total {total} of 20.
      </p>
      <div className="mix">
        {POST_PILLARS.map((p) => (
          <label key={p} title={PILLAR_HINT[p]}>
            {PILLAR_LABELS[p]}
            <input
              className="field"
              type="number"
              min={0}
              max={20}
              value={mix[p]}
              onChange={(e) => setMix((m) => ({ ...m, [p]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn pri"
          type="button"
          disabled={pending || !changed || total !== 20}
          onClick={() =>
            start(async () => {
              if (report(await saveProfileAction(clientId, "pillar_mix", nums)))
                setSaved(mix);
            })
          }
        >
          Save mix
        </button>
        {total !== 20 ? (
          <span className="err">The five numbers must add up to 20.</span>
        ) : null}
      </div>
    </>
  );
}

export function MainGoal({
  clientId,
  initial,
  notes,
}: {
  clientId: string;
  initial: GoalCategory | null;
  notes: string | null;
}) {
  const [goal, setGoal] = useState(initial);
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <>
      <div className="chips">
        {EXPECTATIONS.map((e) => (
          <button
            key={e.key}
            type="button"
            className="chip"
            aria-pressed={goal === e.key}
            disabled={pending}
            style={
              goal === e.key
                ? {
                    background: "var(--navy)",
                    borderColor: "var(--navy)",
                    color: "var(--on-navy)",
                  }
                : undefined
            }
            onClick={() => {
              const next = goal === e.key ? null : e.key;
              const before = goal;
              setGoal(next);
              start(async () => {
                if (
                  !report(
                    await saveProfileAction(clientId, "main_goal", next),
                    { quiet: true },
                  )
                )
                  setGoal(before);
              });
            }}
          >
            {e.label}
          </button>
        ))}
      </div>
      <label className="f" style={{ marginTop: 12 }}>
        Expectations in their words
        <AutoText
          multiline
          value={notes}
          onSave={(v) => saveProfileAction(clientId, "expectation_notes", v)}
        />
      </label>
    </>
  );
}

export function Baseline({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Record<string, number>;
}) {
  const [values, setValues] = useState(initial);
  const saveOne = (key: string) => async (raw: string) => {
    const next = { ...values };
    if (raw.trim() === "") delete next[key];
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0)
        return { error: "Enter a number, 0 or more." };
      next[key] = n;
    }
    const result = await saveProfileAction(clientId, "baseline", next);
    if (!result.error) setValues(next);
    return result;
  };
  return (
    <div className="fgrid">
      {BASELINE_FIELDS.map((b) => (
        <label key={b.key} className="f">
          {b.label}
          <AutoText
            type="number"
            min={0}
            value={values[b.key]}
            onSave={saveOne(b.key)}
          />
        </label>
      ))}
    </div>
  );
}
