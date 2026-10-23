"use client";

import { useState, useTransition } from "react";
import {
  activateClientAction,
  createQuestionnaireLinkAction,
} from "@/app/accounts/actions";
import { useReport, useToast } from "@/components/shared/toast";

export function QuestionnaireLink({
  clientId,
  link,
  hasBrief,
}: {
  clientId: string;
  link: string | null;
  hasBrief: boolean;
}) {
  const [url, setUrl] = useState(link);
  const [pending, start] = useTransition();
  const report = useReport();
  const say = useToast();

  const [confirming, setConfirming] = useState(false);
  const make = () => {
    setConfirming(false);
    start(async () => {
      const result = await createQuestionnaireLinkAction(clientId);
      if (report(result) && result.link) setUrl(result.link);
    });
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {url ? (
        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
          <input
            className="field"
            readOnly
            value={url}
            aria-label="Questionnaire link"
            onFocus={(e) => e.target.select()}
          />
          <button
            className="btn"
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(url).then(
                () => say("Link copied."),
                () => say("Couldn't copy. Select the link and copy it.", "err"),
              )
            }
          >
            Copy
          </button>
        </div>
      ) : null}
      {confirming ? (
        <div className="notice" style={{ display: "grid", gap: 8 }}>
          <span>
            The client has already sent their answers. A new link lets them send
            again, replacing the brief.
          </span>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm pri" type="button" onClick={make}>
              Make a new link
            </button>
            <button
              className="btn sm"
              type="button"
              onClick={() => setConfirming(false)}
            >
              Keep the brief
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            className={url ? "btn" : "btn pri"}
            type="button"
            disabled={pending}
            onClick={() => (hasBrief ? setConfirming(true) : make())}
          >
            {pending
              ? "Making…"
              : url || hasBrief
                ? "Make a new link"
                : "Create questionnaire link"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ActivateButton({
  clientId,
  ready,
}: {
  clientId: string;
  ready: boolean;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn pri"
      type="button"
      disabled={pending || !ready}
      onClick={() =>
        start(async () => void report(await activateClientAction(clientId)))
      }
    >
      {pending ? "Activating…" : "Make the client active"}
    </button>
  );
}
