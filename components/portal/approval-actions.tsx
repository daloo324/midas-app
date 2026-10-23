"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/auth/action-state";

// Approve, or request changes with a note (client-portal.html, Approvals).
export function ApprovalActions({
  id,
  respond,
}: {
  id: string;
  respond: (input: {
    id: string;
    approve: boolean;
    note: string;
  }) => Promise<ActionState>;
}) {
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const send = (approve: boolean) =>
    start(async () => {
      if (!approve && !note.trim())
        return setResult({ error: "Tell us what should change first." });
      setResult(await respond({ id, approve, note: approve ? "" : note }));
    });

  if (result.ok)
    return (
      <p className="notice ok" role="status" style={{ marginTop: 12 }}>
        {result.ok}
      </p>
    );
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
