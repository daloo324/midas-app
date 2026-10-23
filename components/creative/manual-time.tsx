"use client";

import { useState, useTransition } from "react";
import { addManualTimeAction } from "@/app/creative/actions";
import { useReport } from "@/components/shared/toast";

/** Add minutes for a forgotten timer (marked as manual in reports). */
export function ManualTime({
  clientId,
  items,
}: {
  clientId: string;
  items: { id: string; label: string }[];
}) {
  const [target, setTarget] = useState("kit");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <form
      className="panel"
      style={{ marginBottom: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const ok = report(
            await addManualTimeAction({
              itemId: target === "kit" ? null : target,
              kitClientId: target === "kit" ? clientId : null,
              minutes,
              note,
            }),
          );
          if (ok) {
            setMinutes("");
            setNote("");
          }
        });
      }}
    >
      <h2 style={{ marginBottom: 10 }}>Add time by hand</h2>
      <div
        className="fgrid"
        style={{
          gridTemplateColumns: "minmax(0,1.2fr) 110px minmax(0,2fr) auto",
          alignItems: "end",
        }}
      >
        <label className="f">
          For
          <select
            className="field"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="kit">Brand kit</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Minutes
          <input
            className="field"
            type="number"
            min={1}
            max={720}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            required
          />
        </label>
        <label className="f">
          Note
          <input
            className="field"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Forgot the timer on Tuesday"
            required
          />
        </label>
        <button className="btn pri" type="submit" disabled={pending}>
          Add time
        </button>
      </div>
    </form>
  );
}
