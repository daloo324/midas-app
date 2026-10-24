"use client";

import { useTransition } from "react";
import { deleteLeadAction } from "@/app/admin/sales/actions";
import { useReport } from "@/components/shared/toast";

export function RemoveLeadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn danger sm"
      type="button"
      disabled={pending}
      onClick={() => start(async () => void report(await deleteLeadAction(id)))}
    >
      Remove lead
    </button>
  );
}
