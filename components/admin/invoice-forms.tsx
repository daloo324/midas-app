"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createInvoiceAction,
  creditNoteAction,
  deleteInvoiceDraftAction,
  issueInvoiceAction,
  issueManyAction,
  recordPaymentAction,
  resendInvoiceAction,
  runRetainerAction,
} from "@/app/admin/invoices/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { useReport } from "@/components/shared/toast";
import { initialState } from "@/lib/auth/action-state";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/format/status";

export function DraftInvoiceActions({
  id,
  email,
}: {
  id: string;
  email: string | null;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="sub" style={{ margin: 0 }}>
        Issue numbers the invoice, sets the issue and due dates, stores the PDF,
        shows it in the client&apos;s portal and emails it
        {email ? ` to ${email}` : ""}. It can&apos;t be changed after that. Save
        your changes first.
      </p>
      {!email ? (
        <p className="sub" style={{ margin: 0, color: "var(--warn)" }}>
          This client has no contact email, so the invoice will only appear in
          their portal.
        </p>
      ) : null}
      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn gold"
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => void report(await issueInvoiceAction(id)))
          }
        >
          {pending ? "Issuing…" : "Issue invoice"}
        </button>
        <button
          className="btn danger"
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => void report(await deleteInvoiceDraftAction(id)))
          }
        >
          Remove draft
        </button>
      </div>
    </div>
  );
}

export function ResendInvoiceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => void report(await resendInvoiceAction(id)))
      }
    >
      {pending ? "Sending…" : "Email again"}
    </button>
  );
}

export function PaymentForm({
  invoiceId,
  balance,
  today,
}: {
  invoiceId: string;
  balance: number;
  today: string;
}) {
  const [state, action] = useActionState(recordPaymentAction, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="fgrid">
        <label className="f">
          Amount (P)
          <input
            key={balance}
            className="field"
            name="amount"
            inputMode="decimal"
            defaultValue={balance.toFixed(2)}
            required
          />
          <FieldError state={state} name="amount" />
        </label>
        <label className="f">
          Date paid
          <input
            className="field"
            type="date"
            name="paidOn"
            defaultValue={today}
            max={today}
            required
          />
          <FieldError state={state} name="paidOn" />
        </label>
        <label className="f">
          Method
          <select className="field" name="method" defaultValue="eft">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Reference (optional)
          <input className="field" name="reference" />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving…">Record payment</SubmitButton>
      </div>
    </form>
  );
}

export function CreditNoteForm({
  invoiceId,
  balance,
}: {
  invoiceId: string;
  balance: number;
}) {
  const [state, action] = useActionState(creditNoteAction, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="fgrid">
        <label className="f">
          Amount (P), up to {formatMoney(balance)}
          <input className="field" name="amount" inputMode="decimal" required />
          <FieldError state={state} name="amount" />
        </label>
        <label className="f full">
          Reason
          <input
            className="field"
            name="reason"
            required
            placeholder="e.g. Discount agreed for a late start"
          />
          <FieldError state={state} name="reason" />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Issuing…" className="btn">
          Issue credit note
        </SubmitButton>
      </div>
    </form>
  );
}

export function NewInvoiceForm({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createInvoiceAction, initialState);
  return (
    <form
      action={action}
      noValidate
      className="row"
      style={{ gap: 8, alignItems: "end", flexWrap: "wrap" }}
    >
      <label className="f" style={{ minWidth: 220 }}>
        New invoice for
        <select className="field" name="clientId" defaultValue="" required>
          <option value="" disabled>
            Choose a client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldError state={state} name="clientId" />
      </label>
      <SubmitButton pendingText="Starting…">Start invoice</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function RetainerRun({ month }: { month: string }) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => void report(await runRetainerAction(month)))
      }
    >
      {pending ? "Making drafts…" : "Make this month's retainer drafts"}
    </button>
  );
}

export function IssueDrafts({
  drafts,
}: {
  drafts: {
    id: string;
    client: string;
    label: string;
    total: number;
    email: boolean;
  }[];
}) {
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(drafts.map((d) => d.id)),
  );
  const [pending, start] = useTransition();
  const report = useReport();
  const toggle = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const total = drafts
    .filter((d) => chosen.has(d.id))
    .reduce((a, d) => a + d.total, 0);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  aria-label="Choose all"
                  checked={chosen.size === drafts.length}
                  onChange={(e) =>
                    setChosen(
                      new Set(e.target.checked ? drafts.map((d) => d.id) : []),
                    )
                  }
                />
              </th>
              <th>Client</th>
              <th>Line</th>
              <th className="num-c">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Issue ${d.client}`}
                    checked={chosen.has(d.id)}
                    onChange={() => toggle(d.id)}
                  />
                </td>
                <td>
                  <a href={`/admin/invoices/${d.id}`}>{d.client}</a>
                </td>
                <td>{d.label}</td>
                <td className="num-c">{formatMoney(d.total)}</td>
                <td>
                  {d.email ? null : (
                    <span className="pill s-warn">No email</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row between">
        <span className="sub">
          {chosen.size} chosen · {formatMoney(total)}
        </span>
        <button
          className="btn gold"
          type="button"
          disabled={pending || !chosen.size}
          onClick={() =>
            start(async () => void report(await issueManyAction([...chosen])))
          }
        >
          {pending
            ? "Issuing…"
            : `Issue ${chosen.size} invoice${chosen.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
