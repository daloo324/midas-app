"use client";

import { useActionState } from "react";
import { updateClientAccountAction } from "@/app/admin/clients/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { formatMoney } from "@/lib/format";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  type ClientStatus,
} from "@/lib/format/status";

type Option = { id: string; label: string };
type ServiceOption = { id: string; name: string; price: number };

export function ClientAccountForm({
  client,
  execs,
  services,
}: {
  client: {
    id: string;
    status: ClientStatus;
    account_exec_id: string | null;
    service_id: string | null;
    monthly_fee: number | null;
    start_date: string | null;
    end_date: string | null;
  };
  execs: Option[];
  services: ServiceOption[];
}) {
  const [state, action] = useActionState(
    updateClientAccountAction,
    initialState,
  );
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="clientId" value={client.id} />
      <label className="f">
        Status
        <select className="field" name="status" defaultValue={client.status}>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <FieldError state={state} name="status" />
      </label>
      <label className="f">
        Account exec
        <select
          className="field"
          name="accountExecId"
          defaultValue={client.account_exec_id ?? ""}
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
          defaultValue={client.service_id ?? ""}
        >
          <option value="" disabled>
            Choose a service
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatMoney(s.price)}
            </option>
          ))}
        </select>
        <FieldError state={state} name="serviceId" />
      </label>
      <div className="kv" style={{ fontSize: 14 }}>
        <span>Monthly fee</span>
        <span>{formatMoney(client.monthly_fee)}</span>
      </div>
      <div className="fgrid">
        <label className="f">
          Start date
          <input
            className="field"
            type="date"
            name="startDate"
            defaultValue={client.start_date ?? ""}
          />
          <FieldError state={state} name="startDate" />
        </label>
        <label className="f">
          End date
          <input
            className="field"
            type="date"
            name="endDate"
            defaultValue={client.end_date ?? ""}
          />
          <FieldError state={state} name="endDate" />
        </label>
      </div>
      <p className="sub" style={{ margin: 0, fontSize: 13 }}>
        Changing the service copies its current price as the monthly fee.
        Activating a client with no start date uses today.
      </p>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving…">Save account</SubmitButton>
      </div>
    </form>
  );
}
