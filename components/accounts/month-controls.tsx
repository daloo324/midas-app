"use client";

import { useState, useTransition } from "react";
import { startMonthAction, toggleCheckAction } from "@/app/accounts/actions";
import { monthLabel, type CheckKey } from "@/lib/content/constants";
import { useReport } from "./toast";

export function StartMonthButton({
  clientId,
  month,
}: {
  clientId: string;
  month: string;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn pri"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => void report(await startMonthAction(clientId, month)))
      }
    >
      {pending ? "Starting…" : `Start ${monthLabel(month)}`}
    </button>
  );
}

export function CheckToggle({
  monthId,
  check,
  done,
}: {
  monthId: string;
  check: CheckKey;
  done: boolean;
}) {
  const [on, setOn] = useState(done);
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <input
      type="checkbox"
      checked={on}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.checked;
        setOn(next);
        start(async () => {
          if (
            !report(
              await toggleCheckAction({ monthId, key: check, done: next }),
              { quiet: true },
            )
          )
            setOn(!next);
        });
      }}
    />
  );
}
