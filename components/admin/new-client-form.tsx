"use client";

import { useActionState } from "react";
import { createClientAction } from "@/app/admin/clients/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { formatMoney } from "@/lib/format";

type Option = { id: string; label: string };
type ServiceOption = { id: string; name: string; price: number };

export function NewClientForm({
  execs,
  services,
}: {
  execs: Option[];
  services: ServiceOption[];
}) {
  const [state, action] = useActionState(createClientAction, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <div className="fgrid">
        <label className="f full">
          Business name
          <input className="field" type="text" name="name" required />
          <FieldError state={state} name="name" />
        </label>
        <label className="f">
          Industry
          <input className="field" type="text" name="industry" />
        </label>
        <label className="f">
          Contact name
          <input className="field" type="text" name="contactName" />
        </label>
        <label className="f">
          Contact email
          <input className="field" type="email" name="contactEmail" />
          <FieldError state={state} name="contactEmail" />
        </label>
        <label className="f">
          Contact phone
          <input className="field" type="tel" name="contactPhone" />
        </label>
        <label className="f">
          Account exec
          <select
            className="field"
            name="accountExecId"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Choose an account exec
            </option>
            {execs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <FieldError state={state} name="accountExecId" />
        </label>
        <label className="f">
          Service
          <select
            className="field"
            name="serviceId"
            defaultValue={services[0]?.id ?? ""}
            required
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatMoney(s.price)}
              </option>
            ))}
          </select>
          <FieldError state={state} name="serviceId" />
        </label>
      </div>
      <p className="sub" style={{ margin: 0, fontSize: 13 }}>
        The client starts in Onboarding. The monthly fee is copied from the
        service now, so later price changes don&apos;t affect it.
      </p>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Creating…">Create client</SubmitButton>
      </div>
    </form>
  );
}
