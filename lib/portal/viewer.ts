import "server-only";
import { notFound } from "next/navigation";
import { requireArea, staffWithRole } from "@/lib/auth/session";
import { getPortalClient } from "@/lib/data/portal";
import { uuid } from "@/lib/validation/accounts";

// Whose portal is on screen. A client sees their own; the CEO can preview any
// client's, read-only (01-auth-and-roles.md, "Area guards").

export type Viewer = {
  clientId: string;
  clientName: string;
  firstName: string;
  loginId: string | null;
  readOnly: boolean;
  /** Where portal links start: /portal, or /portal/preview/{id} for the CEO. */
  base: string;
};

export async function clientViewer(): Promise<Viewer> {
  const user = await requireArea("portal");
  if (user.kind !== "client") notFound();
  return {
    clientId: user.clientId,
    clientName: user.clientName,
    firstName: user.name.split(/\s+/)[0] || user.name,
    loginId: user.loginId,
    readOnly: false,
    base: "/portal",
  };
}

export async function previewViewer(clientId: string): Promise<Viewer> {
  if (!(await staffWithRole(["ceo"]))) notFound();
  if (!uuid.safeParse(clientId).success) notFound();
  const client = await getPortalClient(clientId);
  if (!client) notFound();
  return {
    clientId,
    clientName: client.name,
    firstName: "there",
    loginId: client.client_code,
    readOnly: true,
    base: `/portal/preview/${clientId}`,
  };
}
