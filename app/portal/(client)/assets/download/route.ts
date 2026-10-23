import { getCurrentUser } from "@/lib/auth/session";
import { kitZipResponse } from "@/lib/creative/kit-zip";
import { createClient } from "@/lib/supabase/server";

// GET: the client's own signed-off brand kit as a zip (the same zip as /creative).
export async function GET() {
  const user = await getCurrentUser();
  if (user?.kind !== "client")
    return new Response("Not allowed", { status: 403 });
  const supabase = await createClient();
  const { data: kit } = await supabase
    .from("brand_kits")
    .select("status")
    .eq("client_id", user.clientId)
    .maybeSingle();
  if (kit?.status !== "approved")
    return new Response("Your brand kit isn't signed off yet.", {
      status: 403,
    });
  return kitZipResponse(supabase, user.clientId);
}
