"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/data/errors";
import type { ServiceUnit } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validation/admin";

// The service catalogue. Price changes reach new quotes only: quote and
// invoice lines keep their own copy (CLAUDE.md rule 8).

export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"])))
    return { error: "Only the CEO can do this." };
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const s = parsed.data;
  const row = {
    name: s.name,
    description: s.description,
    unit: s.unit as ServiceUnit,
    price: s.price,
    sort: s.sort,
    active: s.active,
    is_retainer: s.isRetainer,
    inclusions: s.isRetainer ? s.inclusions : [],
  };
  const supabase = await createClient();
  const { error } = s.id
    ? await supabase.from("services").update(row).eq("id", s.id)
    : await supabase.from("services").insert(row);
  if (error)
    return {
      error: friendlyError(error, "The service didn't save. Try again."),
    };
  revalidatePath("/admin/services");
  return {
    ok: s.id
      ? `${s.name} saved. New quotes use the new details; existing quotes and invoices don't change.`
      : `${s.name} added.`,
  };
}
