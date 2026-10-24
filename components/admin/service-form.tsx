"use client";

import { useActionState } from "react";
import { saveServiceAction } from "@/app/admin/services/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { SERVICE_UNITS, SERVICE_UNIT_LABELS } from "@/lib/format/status";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  sort: number;
  active: boolean;
  is_retainer: boolean;
  inclusions: string[];
};

/** Add a service (no `service`) or edit one. */
export function ServiceForm({ service }: { service?: ServiceRow }) {
  const [state, action] = useActionState(saveServiceAction, initialState);
  const key = service?.id ?? "new";
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <div className="fgrid">
        <label className="f full">
          Name
          <input
            className="field"
            name="name"
            defaultValue={service?.name}
            required
          />
          <FieldError state={state} name="name" />
        </label>
        <label className="f full">
          Description
          <textarea
            className="field"
            name="description"
            rows={2}
            defaultValue={service?.description ?? ""}
          />
          <FieldError state={state} name="description" />
        </label>
        <label className="f">
          Unit
          <select
            className="field"
            name="unit"
            defaultValue={service?.unit ?? "monthly"}
          >
            {SERVICE_UNITS.map((u) => (
              <option key={u} value={u}>
                {SERVICE_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Price (P)
          <input
            className="field"
            name="price"
            inputMode="decimal"
            defaultValue={service ? service.price.toFixed(2) : ""}
            placeholder="3250.00"
            required
          />
          <FieldError state={state} name="price" />
        </label>
        <label className="f">
          Sort order
          <input
            className="field"
            name="sort"
            inputMode="numeric"
            defaultValue={String(service?.sort ?? 0)}
          />
          <FieldError state={state} name="sort" />
        </label>
        <div className="f" style={{ alignContent: "end", gap: 8 }}>
          <label className="row" style={{ gap: 6 }}>
            <input
              type="checkbox"
              name="active"
              defaultChecked={service?.active ?? true}
            />
            Active (can be added to new quotes)
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input
              type="checkbox"
              name="isRetainer"
              defaultChecked={service?.is_retainer ?? false}
            />
            Monthly retainer
          </label>
        </div>
        <label className="f full">
          Retainer inclusions (one per line, shown in the client portal)
          <textarea
            className="field"
            name="inclusions"
            rows={4}
            defaultValue={service?.inclusions.join("\n") ?? ""}
            placeholder={"20 static posts\n4 stories\n2 reels"}
          />
          <FieldError state={state} name="inclusions" />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton key={key} pendingText="Saving…">
          {service ? "Save service" : "Add service"}
        </SubmitButton>
      </div>
    </form>
  );
}
