"use client";

import { useState, useTransition } from "react";
import { setRemindersAction } from "@/app/admin/clients/actions";
import { useReport } from "@/components/shared/toast";

export function RemindersSwitch({
  clientId,
  enabled,
}: {
  clientId: string;
  enabled: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <label className="row" style={{ gap: 8 }}>
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            if (!report(await setRemindersAction(clientId, next))) setOn(!next);
          });
        }}
      />
      Send payment reminders to this client
    </label>
  );
}
