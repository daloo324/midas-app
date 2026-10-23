"use client";

import { useEffect, useState, useTransition } from "react";
import { undoAction } from "@/app/portal/actions";
import type { ActionState } from "@/lib/auth/action-state";

type EntityType = "content_item" | "content_month" | "campaign" | "brand_kit";
const UNDO_MS = 10 * 60 * 1000;

/**
 * Approve, or request changes with a note (client-portal.html, Approvals).
 * After answering, Undo is offered for 10 minutes; the database refuses it
 * once Midas has acted. Read-only in the CEO's preview.
 */
export function ApprovalActions({
  id,
  respond,
  undo,
  readOnly = false,
}: {
  id: string;
  respond: (input: {
    id: string;
    approve: boolean;
    note: string;
  }) => Promise<ActionState>;
  undo: { entityType: EntityType; id: string };
  readOnly?: boolean;
}) {
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ActionState & { at?: number }>({});
  const [canUndo, setCanUndo] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!result.at) return;
    const t = setTimeout(
      () => setCanUndo(false),
      UNDO_MS - (Date.now() - result.at),
    );
    return () => clearTimeout(t);
  }, [result.at]);

  if (readOnly)
    return (
      <p className="sub" style={{ marginTop: 12 }}>
        Preview only: the client approves or asks for changes here.
      </p>
    );

  const send = (approve: boolean) =>
    start(async () => {
      if (!approve && !note.trim())
        return setResult({ error: "Tell us what should change first." });
      const r = await respond({ id, approve, note: approve ? "" : note });
      setResult({ ...r, at: r.ok ? Date.now() : undefined });
      setCanUndo(Boolean(r.ok));
    });

  if (result.ok) {
    return (
      <div className="row" style={{ marginTop: 12 }}>
        <p className="notice ok" role="status" style={{ margin: 0 }}>
          {result.ok}
        </p>
        {canUndo ? (
          <button
            className="link"
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await undoAction(undo);
                if (r.ok) {
                  setResult({});
                  setWriting(false);
                  setNote("");
                } else setResult((x) => ({ ...x, error: r.error }));
                setCanUndo(false);
              })
            }
          >
            Undo
          </button>
        ) : null}
        {result.error ? (
          <span className="err" role="alert">
            {result.error}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <>
      {writing ? (
        <>
          <label className="f" style={{ marginTop: 10 }}>
            What should change?
            <textarea
              className="field"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Be specific: wording, image, colour, date"
            />
          </label>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn pri sm"
              type="button"
              disabled={pending}
              onClick={() => send(false)}
            >
              Send to Midas
            </button>
            <button
              className="btn sm"
              type="button"
              onClick={() => setWriting(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn good"
            type="button"
            disabled={pending}
            onClick={() => send(true)}
          >
            Approve
          </button>
          <button
            className="btn"
            type="button"
            disabled={pending}
            onClick={() => setWriting(true)}
          >
            Request changes
          </button>
        </div>
      )}
      {result.error ? (
        <p className="err" role="alert" style={{ marginTop: 8 }}>
          {result.error}
        </p>
      ) : null}
    </>
  );
}
