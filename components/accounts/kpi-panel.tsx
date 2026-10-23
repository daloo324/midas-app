"use client";

import { useTransition } from "react";
import {
  publishReviewAction,
  saveKpiAction,
  saveReviewAction,
  unpublishReviewAction,
} from "@/app/accounts/actions";
import { AutoSelect, AutoText } from "./auto-field";
import { useReport } from "./toast";

export function KpiInput({
  clientId,
  month,
  kpi,
  value,
  disabled,
  label,
}: {
  clientId: string;
  month: string;
  kpi: string;
  value: number | undefined;
  disabled: boolean;
  label: string;
}) {
  return (
    <AutoText
      type="number"
      min={0}
      step="any"
      value={value}
      disabled={disabled}
      aria-label={label}
      id={`k_${kpi}`}
      onSave={(v) => saveKpiAction({ clientId, month, key: kpi, value: v })}
    />
  );
}

export function ReviewField({
  monthId,
  field,
  value,
  disabled,
  multiline,
  placeholder,
  id,
}: {
  monthId: string;
  field: "working" | "adjust" | "focus";
  value: string | undefined;
  disabled: boolean;
  multiline?: boolean;
  placeholder?: string;
  id: string;
}) {
  return (
    <AutoText
      id={id}
      type="text"
      multiline={multiline}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onSave={(v) => saveReviewAction({ monthId, key: field, value: v })}
    />
  );
}

export function TopPiece({
  monthId,
  value,
  options,
  disabled,
}: {
  monthId: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  disabled: boolean;
}) {
  return (
    <AutoSelect
      value={value}
      options={options}
      placeholder={
        options.length ? "Choose a published item…" : "Nothing published yet"
      }
      disabled={disabled}
      aria-label="Top piece this month"
      onSave={(v) => saveReviewAction({ monthId, key: "top_piece", value: v })}
    />
  );
}

export function PublishReview({
  monthId,
  published,
  isCeo,
}: {
  monthId: string;
  published: boolean;
  isCeo: boolean;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  if (published) {
    return isCeo ? (
      <button
        className="btn"
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => void report(await unpublishReviewAction(monthId)))
        }
      >
        Unpublish review
      </button>
    ) : null;
  }
  return (
    <button
      className="btn pri"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => void report(await publishReviewAction(monthId)))
      }
    >
      {pending ? "Publishing…" : "Publish review"}
    </button>
  );
}
