"use client";

import { useActionState } from "react";
import { saveLeadAction } from "@/app/admin/sales/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/lib/format/status";

export type LeadFormValues = {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  estimated_value: number | null;
  owner_id: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
};

export function LeadForm({
  lead,
  owners,
  defaultOwner,
}: {
  lead?: LeadFormValues;
  owners: { id: string; full_name: string }[];
  defaultOwner?: string;
}) {
  const [state, action] = useActionState(saveLeadAction, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="id" value={lead?.id ?? ""} />
      <div className="fgrid">
        <label className="f full">
          Company
          <input
            className="field"
            name="company"
            defaultValue={lead?.company}
            required
          />
          <FieldError state={state} name="company" />
        </label>
        <label className="f">
          Contact name
          <input
            className="field"
            name="contactName"
            defaultValue={lead?.contact_name ?? ""}
          />
        </label>
        <label className="f">
          Email
          <input
            className="field"
            type="email"
            name="email"
            defaultValue={lead?.email ?? ""}
          />
          <FieldError state={state} name="email" />
        </label>
        <label className="f">
          Phone
          <input
            className="field"
            type="tel"
            name="phone"
            defaultValue={lead?.phone ?? ""}
          />
        </label>
        <label className="f">
          Source
          <select
            className="field"
            name="source"
            defaultValue={lead?.source ?? "referral"}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {LEAD_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Estimated value (P)
          <input
            className="field"
            name="estimatedValue"
            inputMode="decimal"
            defaultValue={lead?.estimated_value?.toFixed(2) ?? ""}
          />
          <FieldError state={state} name="estimatedValue" />
        </label>
        <label className="f">
          Owner
          <select
            className="field"
            name="ownerId"
            defaultValue={lead?.owner_id ?? defaultOwner ?? ""}
          >
            <option value="">Nobody yet</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Next action
          <input
            className="field"
            name="nextAction"
            defaultValue={lead?.next_action ?? ""}
            placeholder="e.g. Call to follow up"
          />
        </label>
        <label className="f">
          Next action date
          <input
            className="field"
            type="date"
            name="nextActionDate"
            defaultValue={lead?.next_action_date ?? ""}
          />
          <FieldError state={state} name="nextActionDate" />
        </label>
        <label className="f full">
          Notes
          <textarea
            className="field"
            name="notes"
            rows={3}
            defaultValue={lead?.notes ?? ""}
          />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving…">
          {lead ? "Save lead" : "Add lead"}
        </SubmitButton>
      </div>
    </form>
  );
}
