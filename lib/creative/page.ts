import "server-only";
import { notFound } from "next/navigation";
import { getStudioClient } from "@/lib/data/creative";
import { uuid } from "@/lib/validation/creative";

export { resolveMonth } from "@/lib/accounts/page";

/** The client with their kit, or a 404 if this person can't see them. */
export async function studioClientOr404(id: string) {
  if (!uuid.safeParse(id).success) notFound();
  const client = await getStudioClient(id);
  if (!client) notFound();
  return client;
}
