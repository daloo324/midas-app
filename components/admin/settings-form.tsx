"use client";

import { startTransition, useActionState, useState } from "react";
import { FormMessage } from "@/components/shared/form-message";
import { initialState, type ActionState } from "@/lib/auth/action-state";
import { cx } from "@/lib/cx";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** One settings panel: its fields, a save button and the result. */
export function SettingsForm({
  action,
  children,
  button = "Save",
}: {
  action: Action;
  children: React.ReactNode;
  button?: string;
}) {
  const [state, run, pending] = useActionState(action, initialState);
  // Submitted by hand so a failed save keeps what was typed (a form action
  // would reset the fields).
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      <div className="fgrid">{children}</div>
      <FormMessage state={state} />
      <div>
        <button className="btn pri" type="submit" disabled={pending}>
          {pending ? "Saving…" : button}
        </button>
      </div>
    </form>
  );
}

/** The VAT panel: says exactly what switching VAT on changes. */
export function VatForm({
  action,
  registered,
  number,
  rate,
}: {
  action: Action;
  registered: boolean;
  number: string | null;
  rate: number;
}) {
  const [on, setOn] = useState(registered);
  return (
    <SettingsForm action={action} button="Save VAT settings">
      <label className="row full" style={{ gap: 8 }}>
        <input
          type="checkbox"
          name="vatRegistered"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
        />
        Midas is VAT-registered
      </label>
      <label className="f">
        VAT number
        <input className="field" name="vatNumber" defaultValue={number ?? ""} />
      </label>
      <label className="f">
        VAT rate (%)
        <input
          className="field"
          name="vatRate"
          inputMode="decimal"
          defaultValue={String(rate)}
        />
      </label>
      <div className={cx("notice full", on !== registered && "warn")}>
        {on
          ? 'With VAT on, new quotes and invoices add VAT at this rate and are titled "Tax invoice". Quotes and invoices already sent or issued stay exactly as they are.'
          : 'With VAT off, documents are titled "Invoice" and show no VAT line. Documents already issued with VAT keep it.'}
      </div>
    </SettingsForm>
  );
}
