"use client";

import { saveDesignNotesAction } from "@/app/creative/actions";
import { AutoText } from "@/components/shared/auto-field";

export function DesignNotes({
  clientId,
  notes,
}: {
  clientId: string;
  notes: string | null;
}) {
  return (
    <AutoText
      multiline
      rows={12}
      value={notes}
      aria-label="Designer notes"
      id="designNotes"
      placeholder="Motifs, do's and don'ts, words the client used"
      onSave={(v) => saveDesignNotesAction(clientId, v)}
    />
  );
}
