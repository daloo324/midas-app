// Labels and pill colours for statuses, matching the prototypes' pill classes.

import type { Database } from "@/lib/supabase/database.types";

export type ClientStatus = Database["public"]["Enums"]["client_status"];

export const CLIENT_STATUSES: readonly ClientStatus[] = [
  "lead_won",
  "onboarding",
  "active",
  "paused",
  "ended",
];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  lead_won: "Won",
  onboarding: "Onboarding",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

export const CLIENT_STATUS_PILL: Record<ClientStatus, string> = {
  lead_won: "s-gold",
  onboarding: "s-info",
  active: "s-good",
  paused: "s-warn",
  ended: "",
};
