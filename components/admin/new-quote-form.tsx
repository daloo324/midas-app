"use client";

import { useActionState } from "react";
import { createQuoteAction } from "@/app/admin/quotes/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";

export function NewQuoteForm({
  leads,
  clients,
  selected,
}: {
  leads: { id: string; company: string }[];
  clients: { id: string; name: string }[];
  selected?: string;
}) {
  const [state, action] = useActionState(createQuoteAction, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <label className="f">
        Who is it for?
        <select
          className="field"
          name="recipient"
          defaultValue={selected ?? ""}
          required
        >
          <option value="" disabled>
            Choose a lead or client
          </option>
          {leads.length ? (
            <optgroup label="Leads">
              {leads.map((l) => (
                <option key={l.id} value={`lead:${l.id}`}>
                  {l.company}
                </option>
              ))}
            </optgroup>
          ) : null}
          {clients.length ? (
            <optgroup label="Clients">
              {clients.map((c) => (
                <option key={c.id} value={`client:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <FieldError state={state} name="recipient" />
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Starting…">Start the quote</SubmitButton>
      </div>
    </form>
  );
}
