"use client";

import { useActionState } from "react";
import { updateClientRecordAction } from "@/app/admin/clients/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/validation/clients";

export type ClientRecord = {
  id: string;
  name: string;
  industry: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  decision_maker: string | null;
  platforms: string[];
  notes: string | null;
};

export function ClientRecordForm({ client }: { client: ClientRecord }) {
  const [state, action] = useActionState(
    updateClientRecordAction,
    initialState,
  );
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="clientId" value={client.id} />
      <div className="fgrid">
        <label className="f full">
          Business name
          <input
            className="field"
            type="text"
            name="name"
            defaultValue={client.name}
            required
          />
          <FieldError state={state} name="name" />
        </label>
        <label className="f">
          Industry
          <input
            className="field"
            type="text"
            name="industry"
            defaultValue={client.industry ?? ""}
          />
        </label>
        <label className="f">
          Decision maker
          <input
            className="field"
            type="text"
            name="decisionMaker"
            defaultValue={client.decision_maker ?? ""}
          />
        </label>
        <label className="f">
          Contact name
          <input
            className="field"
            type="text"
            name="contactName"
            defaultValue={client.contact_name ?? ""}
          />
        </label>
        <label className="f">
          Contact role
          <input
            className="field"
            type="text"
            name="contactRole"
            defaultValue={client.contact_role ?? ""}
          />
        </label>
        <label className="f">
          Contact email
          <input
            className="field"
            type="email"
            name="contactEmail"
            defaultValue={client.contact_email ?? ""}
          />
          <FieldError state={state} name="contactEmail" />
        </label>
        <label className="f">
          Contact phone
          <input
            className="field"
            type="tel"
            name="contactPhone"
            defaultValue={client.contact_phone ?? ""}
          />
        </label>
        <fieldset
          className="f full"
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend style={{ marginBottom: 5 }}>Platforms</legend>
          <div className="chips">
            {PLATFORMS.map((p) => (
              <label key={p} className="chip">
                <input
                  type="checkbox"
                  name="platforms"
                  value={p}
                  defaultChecked={client.platforms.includes(p)}
                />
                {PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="f full">
          Notes
          <textarea
            className="field"
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
          />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
