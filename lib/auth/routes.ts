// Pure routing rules for sign-in and areas. No server imports, so the proxy,
// layouts and unit tests can all use them.

export const STAFF_ROLES = [
  "ceo",
  "account_exec",
  "creative_director",
  "designer",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type Role = StaffRole | "client";

export type Area = "admin" | "accounts" | "creative" | "portal";

export const AREA_ROLES: Record<Area, readonly Role[]> = {
  admin: ["ceo"],
  accounts: ["ceo", "account_exec"],
  creative: ["ceo", "creative_director", "designer"],
  portal: ["client"],
};

export const ROLE_LABELS: Record<Role, string> = {
  ceo: "CEO",
  account_exec: "Account exec",
  creative_director: "Creative director",
  designer: "Designer",
  client: "Client",
};

export const STAFF_LOGIN = "/login";
export const CLIENT_LOGIN = "/portal/login";

export function isStaffRole(value: unknown): value is StaffRole {
  return (
    typeof value === "string" &&
    (STAFF_ROLES as readonly string[]).includes(value)
  );
}

export function homeFor(role: Role): string {
  switch (role) {
    case "ceo":
      return "/admin";
    case "account_exec":
      return "/accounts";
    case "creative_director":
    case "designer":
      return "/creative";
    case "client":
      return "/portal";
  }
}

export function canEnter(area: Area, role: Role): boolean {
  return AREA_ROLES[area].includes(role);
}

function under(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/");
}

/**
 * Which sign-in a path needs: "staff", "client", or null for public pages.
 * The CEO's portal preview is a staff page.
 */
export function signInNeededFor(path: string): "staff" | "client" | null {
  if (under(path, CLIENT_LOGIN)) return null;
  if (under(path, "/portal/preview")) return "staff";
  if (under(path, "/portal")) return "client";
  if (
    under(path, "/admin") ||
    under(path, "/accounts") ||
    under(path, "/creative")
  )
    return "staff";
  return null;
}

/** Only same-site relative paths are allowed as a post-sign-in destination. */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  return next;
}

/** The area a path belongs to, or null for pages outside the four areas. */
export function areaOf(path: string): Area | null {
  if (under(path, CLIENT_LOGIN)) return null;
  if (under(path, "/portal/preview")) return "admin";
  for (const area of ["admin", "accounts", "creative", "portal"] as const) {
    if (under(path, "/" + area)) return area;
  }
  return null;
}

/**
 * Where to go after signing in: the page they were trying to open, if it's a
 * safe path in an area their role may enter; otherwise their home area.
 */
export function destinationAfterSignIn(next: unknown, role: Role): string {
  const home = homeFor(role);
  const path = safeNext(next, home);
  const area = areaOf(path.split("?")[0]);
  return area && canEnter(area, role) ? path : home;
}
