"use client";

import { useTransition } from "react";
import {
  deleteQuoteDraftAction,
  quoteToInvoiceAction,
  resendQuoteAction,
  sendQuoteAction,
  setQuoteOutcomeAction,
} from "@/app/admin/quotes/actions";
import { useReport } from "@/components/shared/toast";
import type { QuoteStatus } from "@/lib/format/status";

export function QuoteActions({
  id,
  status,
  hasInvoice,
  hasClient,
  recipientEmail,
}: {
  id: string;
  status: QuoteStatus;
  hasInvoice: boolean;
  hasClient: boolean;
  recipientEmail: string | null;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => void report(await fn()));

  if (status === "draft")
    return (
      <div className="stack" style={{ gap: 8 }}>
        <p className="sub" style={{ margin: 0 }}>
          {recipientEmail
            ? `Send numbers the quote, attaches the PDF and emails it to ${recipientEmail}. Save your changes first.`
            : "Add an email to the lead or client before sending."}
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn gold"
            type="button"
            disabled={pending || !recipientEmail}
            onClick={() => run(() => sendQuoteAction(id))}
          >
            {pending ? "Sending…" : "Send to client"}
          </button>
          <button
            className="btn danger"
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteQuoteDraftAction(id))}
          >
            Remove draft
          </button>
        </div>
      </div>
    );

  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      {status === "sent" || status === "expired" ? (
        <>
          <button
            className="btn pri"
            type="button"
            disabled={pending}
            onClick={() => run(() => setQuoteOutcomeAction(id, "accepted"))}
          >
            Mark accepted
          </button>
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={() => run(() => setQuoteOutcomeAction(id, "declined"))}
          >
            Mark declined
          </button>
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={() => run(() => resendQuoteAction(id))}
          >
            Email again
          </button>
        </>
      ) : null}
      {status === "accepted" ? (
        <button
          className="btn gold"
          type="button"
          disabled={pending || (!hasClient && !hasInvoice)}
          title={
            hasClient ? undefined : "Create the client from the won lead first"
          }
          onClick={() => run(() => quoteToInvoiceAction(id))}
        >
          {hasInvoice ? "Open the invoice" : "Create invoice"}
        </button>
      ) : null}
    </div>
  );
}
