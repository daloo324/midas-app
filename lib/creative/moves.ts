import type { WorkStatus } from "@/lib/content/constants";

// The moves the creative team can make, so each person sees only the buttons
// that will work. The database enforces the same table (set_content_status,
// set_brand_kit_status); the CEO can make any of them.

type Role =
  "ceo" | "creative_director" | "designer" | "account_exec" | "client";

const MOVES: {
  from: WorkStatus;
  to: WorkStatus;
  roles: Role[];
  label: string;
  needsNote?: boolean;
}[] = [
  {
    from: "planned",
    to: "in_design",
    roles: ["designer", "creative_director"],
    label: "Start design",
  },
  {
    from: "in_design",
    to: "internal_review",
    roles: ["designer", "creative_director"],
    label: "Send for internal review",
  },
  {
    from: "internal_review",
    to: "client_review",
    roles: ["creative_director"],
    label: "Send to client",
  },
  {
    from: "internal_review",
    to: "changes_requested",
    roles: ["creative_director"],
    label: "Ask for changes",
    needsNote: true,
  },
  {
    from: "changes_requested",
    to: "in_design",
    roles: ["designer", "creative_director"],
    label: "Back to design",
  },
];

export function movesFor(status: WorkStatus, role: string) {
  return MOVES.filter(
    (m) =>
      m.from === status && (role === "ceo" || m.roles.includes(role as Role)),
  );
}
