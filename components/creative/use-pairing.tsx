"use client";

import { useState, useTransition } from "react";
import { setFontPairingAction } from "@/app/creative/actions";
import { useReport } from "@/components/shared/toast";

export function UseForClient({
  heading,
  body,
  clients,
}: {
  heading: string;
  body: string;
  clients: { id: string; name: string }[];
}) {
  const [clientId, setClientId] = useState("");
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <div className="row" style={{ gap: 6 }}>
      <select
        className="field"
        style={{ flex: 1 }}
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        aria-label={`Client for ${heading} and ${body}`}
      >
        <option value="">Choose client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        className="btn sm"
        type="button"
        disabled={!clientId || pending}
        onClick={() =>
          start(
            async () =>
              void report(await setFontPairingAction(clientId, heading, body)),
          )
        }
      >
        Use for client
      </button>
    </div>
  );
}
