import { staffWithRole } from "@/lib/auth/session";
import { kitZipResponse } from "@/lib/creative/kit-zip";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/creative";

// GET: the client's brand kit as a zip, for staff who can see the client.
export async function GET(
  _req: Request,
  { params }: RouteContext<"/creative/clients/[id]/kit/download">,
) {
  const { id } = await params;
  if (!uuid.safeParse(id).success)
    return new Response("Not found", { status: 404 });
  if (
    !(await staffWithRole([
      "ceo",
      "account_exec",
      "creative_director",
      "designer",
    ]))
  )
    return new Response("Not allowed", { status: 403 });
  return kitZipResponse(await createClient(), id);
}
