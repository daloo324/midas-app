import type { ActionState } from "@/lib/auth/action-state";

/** What a data-layer change returns: the form's message, plus an id when one was created. */
export type DataResult = ActionState & { id?: string };
