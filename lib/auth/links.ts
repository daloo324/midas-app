import "server-only";

export type LinkType = "invite" | "recovery";

export function appUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set.");
  return url.replace(/\/+$/, "");
}

/**
 * The link in invite, welcome and reset emails. It opens our own "Set your
 * password" page; the one-time token is only used when the person submits the
 * form, so email scanners that open links can't use it up.
 */
export function setPasswordLink(
  hashedToken: string,
  type: LinkType,
  audience: "staff" | "client",
): string {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type,
    for: audience,
  });
  return `${appUrl()}/set-password?${params.toString()}`;
}
