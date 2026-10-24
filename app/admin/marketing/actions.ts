"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/data/errors";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { marketingMonth } from "@/lib/validation/admin";

/** Saves one month of Midas's own figures (manual rows in metric_daily). */
export async function saveMarketingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"])))
    return { error: "Only the CEO can do this." };
  const parsed = marketingMonth.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const m = parsed.data;
  const day = `${m.month}-01`;
  const clean = (o: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(o).filter(
        ([, v]) => v !== null && !(Array.isArray(v) && !v.length),
      ),
    );
  const rows = {
    facebook: clean({
      followers: m.facebookFollowers,
      reach: m.facebookReach,
      interactions: m.facebookInteractions,
    }),
    instagram: clean({
      followers: m.instagramFollowers,
      reach: m.instagramReach,
      interactions: m.instagramInteractions,
    }),
    website: clean({
      visitors: m.websiteVisitors,
      enquiries: m.websiteEnquiries,
      top_pages: m.topPages,
    }),
  };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("metric_daily")
    .select("id, channel")
    .is("client_id", null)
    .eq("source", "manual")
    .eq("day", day);
  for (const [channel, metrics] of Object.entries(rows)) {
    const row = existing?.find((e) => e.channel === channel);
    const { error } = row
      ? await supabase
          .from("metric_daily")
          .update({ metrics: metrics as NonNullable<Json> })
          .eq("id", row.id)
      : await supabase
          .from("metric_daily")
          .insert({
            source: "manual",
            channel,
            day,
            metrics: metrics as NonNullable<Json>,
          });
    if (error)
      return {
        error: friendlyError(error, "The figures didn't save. Try again."),
      };
  }
  revalidatePath("/admin/marketing");
  return { ok: "Figures saved." };
}
