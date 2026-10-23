"use client";

import { useState, useTransition, type InputHTMLAttributes } from "react";
import type { ActionState } from "@/lib/auth/action-state";
import { useReport } from "./toast";

// Fields that save themselves, like the prototype: text saves when you leave
// the field, selects and ticks as soon as they change.

type Save = (value: string) => Promise<ActionState>;

export function AutoText({
  value,
  onSave,
  multiline = false,
  rows = 3,
  ...rest
}: {
  value: string | number | null | undefined;
  onSave: Save;
  multiline?: boolean;
  rows?: number;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onBlur"
>) {
  const initial = value == null ? "" : String(value);
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const report = useReport();

  // The page refreshed with a new value from elsewhere.
  if (initial !== saved && draft === saved) {
    setSaved(initial);
    setDraft(initial);
  }

  const commit = () => {
    if (draft === saved) return;
    start(async () => {
      const result = await onSave(draft);
      if (report(result, { quiet: true })) setSaved(draft);
      else setDraft(saved);
    });
  };

  const common = {
    className: "field",
    value: draft,
    "aria-busy": pending || undefined,
    onBlur: commit,
  };
  if (multiline) {
    return (
      <textarea
        {...common}
        id={rest.id}
        name={rest.name}
        placeholder={rest.placeholder}
        disabled={rest.disabled}
        aria-label={rest["aria-label"]}
        rows={rows}
        onChange={(e) => setDraft(e.target.value)}
      />
    );
  }
  return (
    <input
      {...rest}
      {...common}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function AutoSelect({
  value,
  options,
  onSave,
  placeholder,
  ...rest
}: {
  value: string | null | undefined;
  options: { value: string; label: string }[];
  onSave: Save;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [current, setCurrent] = useState(value ?? "");
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <select
      {...rest}
      className="field"
      value={current}
      aria-busy={pending || undefined}
      onChange={(e) => {
        const next = e.target.value;
        const before = current;
        setCurrent(next);
        start(async () => {
          if (!report(await onSave(next), { quiet: true })) setCurrent(before);
        });
      }}
    >
      {placeholder !== undefined ? (
        <option value="">{placeholder}</option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
