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

// ---------------------------------------------------------------------------
// Sales and money (Phase 5)
// ---------------------------------------------------------------------------

type Enums = Database["public"]["Enums"];
export type ServiceUnit = Enums["service_unit"];
export type LeadStage = Enums["lead_stage"];
export type LeadSource = Enums["lead_source"];
export type QuoteStatus = Enums["quote_status"];
export type InvoiceStatus = Enums["invoice_status"];

export const SERVICE_UNITS: readonly ServiceUnit[] = [
  "monthly",
  "once_off",
  "hourly",
  "per_item",
];
export const SERVICE_UNIT_LABELS: Record<ServiceUnit, string> = {
  monthly: "Monthly",
  once_off: "Once-off",
  hourly: "Hourly",
  per_item: "Per item",
};
/** "per month" etc., after a price. */
export const SERVICE_UNIT_SUFFIX: Record<ServiceUnit, string> = {
  monthly: "/ month",
  once_off: "once-off",
  hourly: "/ hour",
  per_item: "/ item",
};

export const LEAD_STAGES: readonly LeadStage[] = [
  "new",
  "contacted",
  "quote_sent",
  "won",
  "lost",
];
export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  quote_sent: "Quote sent",
  won: "Won",
  lost: "Lost",
};
export const LEAD_SOURCES: readonly LeadSource[] = [
  "referral",
  "website",
  "facebook",
  "instagram",
  "linkedin",
  "walk_in",
  "event",
  "other",
];
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: "Referral",
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  walk_in: "Walk-in",
  event: "Event",
  other: "Other",
};
export const LOST_REASONS = [
  "price",
  "timing",
  "competitor",
  "no_response",
  "other",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];
export const LOST_REASON_LABELS: Record<LostReason, string> = {
  price: "Price",
  timing: "Timing",
  competitor: "Chose a competitor",
  no_response: "No response",
  other: "Other",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};
export const QUOTE_STATUS_PILL: Record<QuoteStatus, string> = {
  draft: "",
  sent: "s-info",
  accepted: "s-good",
  declined: "s-bad",
  expired: "s-warn",
};

export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "draft",
  "issued",
  "part_paid",
  "paid",
  "credited",
];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  part_paid: "Part paid",
  paid: "Paid",
  credited: "Credited",
};
export const INVOICE_STATUS_PILL: Record<InvoiceStatus, string> = {
  draft: "",
  issued: "s-info",
  part_paid: "s-warn",
  paid: "s-good",
  credited: "",
};

export const PAYMENT_METHODS = [
  "eft",
  "cash",
  "mobile_money",
  "card",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  eft: "EFT",
  cash: "Cash",
  mobile_money: "Mobile money",
  card: "Card",
  other: "Other",
};
