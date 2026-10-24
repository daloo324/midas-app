"use client";

import { useActionState } from "react";
import { winLeadAction } from "@/app/admin/sales/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { formatMoney } from "@/lib/format";

export function WinLeadForm({
  leadId,
  execs,
  services,
  defaultServiceId,
}: {
  leadId: string;
  execs: { id: string; full_name: string }[];
  services: { id: string; name: string; price: number; agreed?: number }[];
  defaultServiceId?: string;
}) {
  const [state, action] = useActionState(winLeadAction, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="fgrid">
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
                {e.full_name}
              </option>
            ))}
          </select>
          <FieldError state={state} name="accountExecId" />
        </label>
        <label className="f">
          Service and fee
          <select
            className="field"
            name="serviceId"
            defaultValue={defaultServiceId ?? services[0]?.id ?? ""}
            required
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatMoney(s.agreed ?? s.price)}
                {s.agreed != null ? " (from the accepted quote)" : ""}
              </option>
            ))}
          </select>
          <FieldError state={state} name="serviceId" />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Creating…">Create the client</SubmitButton>
      </div>
    </form>
  );
}
