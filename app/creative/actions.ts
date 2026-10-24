"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { FONT_PAIRINGS } from "@/lib/creative/constants";
import { friendlyError } from "@/lib/data/errors";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  comment,
  contentFile,
  designField,
  guideCheck,
  inspiration,
  inspirationEdit,
  kitColor,
  kitField,
  kitFile,
  libraryFont,
  libraryPairing,
  manualTime,
  palette,
  uuid,
  workMove,
} from "@/lib/validation/creative";

// Every change in the Design Studio. Each checks the role here, then runs as
// the signed-in user so RLS, storage rules and the database guards decide.

const CREATIVE = ["ceo", "creative_director", "designer"] as const;
const NOT_ALLOWED: ActionState = {
  error: "Only the creative team can do this.",
};
const BAD_INPUT: ActionState = {
  error: "Something went wrong. Reload the page and try again.",
};
const first = (issues: { message: string }[]) =>
  issues[0]?.message ?? BAD_INPUT.error!;

async function creative() {
  return staffWithRole([...CREATIVE]);
}

function refresh() {
  revalidatePath("/creative", "layout");
}

// ---------------------------------------------------------------------------
// Brief
// ---------------------------------------------------------------------------

export async function saveDesignNotesAction(
  clientId: string,
  notes: string,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  if (!uuid.safeParse(clientId).success || typeof notes !== "string")
    return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_design_notes", {
    p_client_id: clientId,
    p_notes: notes,
  });
  if (error)
    return { error: friendlyError(error, "The notes didn't save. Try again.") };
  return { ok: "Saved." };
}

// ---------------------------------------------------------------------------
// Brand kit
// ---------------------------------------------------------------------------

async function updateKit(
  clientId: string,
  patch: TablesUpdate<"brand_kits">,
  fail: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .update(patch)
    .eq("client_id", clientId)
    .select("id");
  if (error || !data?.length) return { error: friendlyError(error, fail) };
  refresh();
  return { ok: "Saved." };
}

export async function saveKitFieldAction(
  clientId: string,
  field: string,
  value: string,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = kitField.safeParse({ field, value });
  if (!parsed.success || !uuid.safeParse(clientId).success)
    return {
      error: parsed.success ? BAD_INPUT.error : first(parsed.error.issues),
    };
  return updateKit(
    clientId,
    { [parsed.data.field]: parsed.data.value } as TablesUpdate<"brand_kits">,
    "That didn't save. Try again.",
  );
}

export async function setFontPairingAction(
  clientId: string,
  heading: string,
  body: string,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const h = kitField.safeParse({ field: "heading_font", value: heading });
  const b = kitField.safeParse({ field: "body_font", value: body });
  if (!h.success || !b.success || !uuid.safeParse(clientId).success)
    return BAD_INPUT;
  const result = await updateKit(
    clientId,
    {
      heading_font: h.data.value as string | null,
      body_font: b.data.value as string | null,
    },
    "The fonts didn't save. Try again.",
  );
  return result.error ? result : { ok: `Fonts set to ${heading} and ${body}.` };
}

export async function saveKitColorAction(input: unknown): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = kitColor.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { data: kit } = await supabase
    .from("brand_kits")
    .select("colors")
    .eq("client_id", parsed.data.clientId)
    .maybeSingle();
  if (!kit) return NOT_ALLOWED;
  const colors = { ...(kit.colors as Record<string, string>) };
  if (parsed.data.value) colors[parsed.data.role] = parsed.data.value;
  else delete colors[parsed.data.role];
  return updateKit(
    parsed.data.clientId,
    { colors },
    "The colour didn't save. Try again.",
  );
}

export async function savePaletteAction(input: unknown): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = palette.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const colors = Object.fromEntries(
    Object.entries(parsed.data.colors).map(([k, v]) => [k, v.toUpperCase()]),
  );
  const result = await updateKit(
    parsed.data.clientId,
    { colors },
    "The palette didn't save. Try again.",
  );
  return result.error
    ? result
    : { ok: "Palette saved to the client's brand kit." };
}

export async function saveGuideCheckAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = guideCheck.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const supabase = await createClient();
  const { data: kit } = await supabase
    .from("brand_kits")
    .select("guide_checks")
    .eq("client_id", parsed.data.clientId)
    .maybeSingle();
  if (!kit) return NOT_ALLOWED;
  const guide_checks = {
    ...(kit.guide_checks as Record<string, boolean>),
    [parsed.data.key]: parsed.data.done,
  };
  return updateKit(
    parsed.data.clientId,
    { guide_checks },
    "That tick didn't save. Try again.",
  );
}

/**
 * Records a file the browser has just uploaded into the kit. For a fixed
 * slot, the old file is removed from storage first (04-creative.md: replacing
 * deletes the old file).
 */
export async function registerKitFileAction(
  input: unknown,
): Promise<ActionState> {
  const me = await creative();
  if (!me) return NOT_ALLOWED;
  const parsed = kitFile.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const f = parsed.data;
  if (!f.path.startsWith(`${f.clientId}/${f.slot}/`)) return BAD_INPUT;
  const supabase = await createClient();

  let old: { id: string; storage_path: string } | null = null;
  if (f.slot !== "extra") {
    const { data } = await supabase
      .from("brand_kit_files")
      .select("id, storage_path")
      .eq("client_id", f.clientId)
      .eq("slot", f.slot)
      .maybeSingle();
    old = data;
    if (old) await supabase.from("brand_kit_files").delete().eq("id", old.id);
  }
  const { error } = await supabase.from("brand_kit_files").insert({
    client_id: f.clientId,
    slot: f.slot,
    storage_path: f.path,
    file_name: f.name,
    size_bytes: f.size,
    mime_type: f.mime,
    uploaded_by: me.id,
  });
  if (error) {
    await supabase.storage.from("brand-kits").remove([f.path]);
    if (old) {
      // Put the old file back so nothing is lost.
      await supabase.from("brand_kit_files").insert({
        client_id: f.clientId,
        slot: f.slot,
        storage_path: old.storage_path,
        file_name: old.storage_path.split("/").pop()!,
        size_bytes: 0,
        uploaded_by: me.id,
      });
    }
    return {
      error: friendlyError(
        error,
        "The file couldn't be added. Check it's the right type and try again.",
      ),
    };
  }
  if (old) await supabase.storage.from("brand-kits").remove([old.storage_path]);
  refresh();
  return { ok: old ? "Replaced." : "Uploaded." };
}

export async function removeKitFileAction(
  fileId: string,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  if (!uuid.safeParse(fileId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_kit_files")
    .delete()
    .eq("id", fileId)
    .select("storage_path");
  if (error || !data?.length)
    return {
      error: friendlyError(error, "The file couldn't be removed. Try again."),
    };
  await supabase.storage.from("brand-kits").remove([data[0].storage_path]);
  refresh();
  return { ok: "Removed." };
}

export async function kitStatusAction(
  clientId: string,
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = workMove.safeParse(input);
  if (!parsed.success || !uuid.safeParse(clientId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_brand_kit_status", {
    p_client_id: clientId,
    p_new_status: parsed.data.status,
    p_comment: parsed.data.comment ?? undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "The kit's status didn't change. Try again."),
    };
  refresh();
  return {
    ok:
      parsed.data.status === "client_review"
        ? "Sent to the client for sign-off."
        : "Status changed.",
  };
}

// ---------------------------------------------------------------------------
// Weekly board
// ---------------------------------------------------------------------------

export async function saveDesignFieldAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = designField.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      [parsed.data.field]: parsed.data.value,
    } as TablesUpdate<"content_items">)
    .eq("id", parsed.data.itemId)
    .select("id");
  if (error || !data?.length)
    return { error: friendlyError(error, "That didn't save. Try again.") };
  return { ok: "Saved." };
}

export async function itemStatusAction(
  itemId: string,
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = workMove.safeParse(input);
  if (!parsed.success || !uuid.safeParse(itemId).success) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_content_status", {
    p_item_id: itemId,
    p_new_status: parsed.data.status,
    p_comment: parsed.data.comment ?? undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "The status didn't change. Try again."),
    };
  refresh();
  return {
    ok:
      parsed.data.status === "client_review"
        ? "Sent to the client's portal."
        : "Status changed.",
  };
}

/** Records the final file or the client preview the browser just uploaded. */
export async function registerContentFileAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = contentFile.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const supabase = await createClient();
  const column =
    parsed.data.kind === "final" ? "final_file_path" : "preview_path";
  const { data: item } = await supabase
    .from("content_items")
    .select("final_file_path, preview_path, client_id")
    .eq("id", parsed.data.itemId)
    .maybeSingle();
  if (!item || !parsed.data.path.startsWith(`${item.client_id}/`))
    return BAD_INPUT;
  const old = item[column];
  const { error } = await supabase
    .from("content_items")
    .update({ [column]: parsed.data.path } as TablesUpdate<"content_items">)
    .eq("id", parsed.data.itemId);
  if (error) {
    await supabase.storage.from("content").remove([parsed.data.path]);
    return {
      error: friendlyError(error, "The file couldn't be saved. Try again."),
    };
  }
  if (old && old !== parsed.data.path)
    await supabase.storage.from("content").remove([old]);
  refresh();
  return {
    ok:
      parsed.data.kind === "final"
        ? "Final file saved."
        : "Client preview saved.",
  };
}

export async function addCommentAction(input: unknown): Promise<ActionState> {
  const me = await staffWithRole([...CREATIVE]);
  if (!me) return NOT_ALLOWED;
  const parsed = comment.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("content_items")
    .select("client_id")
    .eq("id", parsed.data.itemId)
    .maybeSingle();
  if (!item) return BAD_INPUT;
  const { error } = await supabase.from("comments").insert({
    client_id: item.client_id,
    entity_type: "content_item",
    entity_id: parsed.data.itemId,
    body: parsed.data.body,
    author_id: me.id,
    author_kind: "staff",
    visible_to_client: parsed.data.visibleToClient,
  });
  if (error)
    return {
      error: friendlyError(error, "The comment didn't save. Try again."),
    };
  refresh();
  return {
    ok: parsed.data.visibleToClient ? "Sent to the client." : "Comment added.",
  };
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export async function startTimerAction(target: {
  itemId?: string;
  kitClientId?: string;
}): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const itemId =
    target.itemId && uuid.safeParse(target.itemId).success
      ? target.itemId
      : undefined;
  const kitClientId =
    target.kitClientId && uuid.safeParse(target.kitClientId).success
      ? target.kitClientId
      : undefined;
  if (!itemId === !kitClientId) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_timer", {
    p_item_id: itemId,
    p_kit_client_id: kitClientId,
  });
  if (error)
    return {
      error: friendlyError(error, "The timer didn't start. Try again."),
    };
  refresh();
  return { ok: "Timer started." };
}

export async function stopTimerAction(at?: string): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  if (at !== undefined && Number.isNaN(Date.parse(at))) return BAD_INPUT;
  const supabase = await createClient();
  const { error } = await supabase.rpc("stop_timer", { p_at: at });
  if (error)
    return { error: friendlyError(error, "The timer didn't stop. Try again.") };
  refresh();
  return { ok: "Timer stopped." };
}

export async function addManualTimeAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = manualTime.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_manual_time", {
    p_minutes: parsed.data.minutes,
    p_note: parsed.data.note,
    p_item_id: parsed.data.itemId ?? undefined,
    p_kit_client_id: parsed.data.kitClientId ?? undefined,
  });
  if (error)
    return { error: friendlyError(error, "The time didn't save. Try again.") };
  refresh();
  return { ok: `${parsed.data.minutes} minutes added.` };
}

// ---------------------------------------------------------------------------
// Inspiration
// ---------------------------------------------------------------------------

export async function addInspirationAction(
  input: unknown,
): Promise<ActionState> {
  const me = await creative();
  if (!me) return NOT_ALLOWED;
  const parsed = inspiration.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.from("inspiration").insert({
    storage_path: parsed.data.path,
    note: parsed.data.note,
    tags: parsed.data.tags,
    client_id: parsed.data.clientId,
    uploaded_by: me.id,
  });
  if (error) {
    await supabase.storage.from("inspiration").remove([parsed.data.path]);
    return {
      error: friendlyError(error, "The image couldn't be added. Try again."),
    };
  }
  refresh();
  return { ok: "Added to the board." };
}

export async function editInspirationAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  const parsed = inspirationEdit.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  const { id, note, tags, clientId } = parsed.data;
  const patch: TablesUpdate<"inspiration"> = {};
  if (note !== undefined) patch.note = note;
  if (tags !== undefined) patch.tags = tags;
  if (clientId !== undefined) patch.client_id = clientId;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspiration")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return {
      error: friendlyError(
        error,
        "Only the person who uploaded it, or the creative director, can change it.",
      ),
    };
  return { ok: "Saved." };
}

export async function deleteInspirationAction(
  id: string,
): Promise<ActionState> {
  if (!(await creative())) return NOT_ALLOWED;
  if (!uuid.safeParse(id).success) return BAD_INPUT;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspiration")
    .delete()
    .eq("id", id)
    .select("storage_path");
  if (error || !data?.length)
    return {
      error:
        "Only the person who uploaded it, or the creative director, can remove it.",
    };
  await supabase.storage.from("inspiration").remove([data[0].storage_path]);
  refresh();
  return { ok: "Removed." };
}

// ---------------------------------------------------------------------------
// Font library: the creative director (or CEO) adds downloaded fonts and
// pairings; the whole team sees and uses them.
// ---------------------------------------------------------------------------

const LIBRARY_ONLY: ActionState = {
  error: "Only the creative director can change the font library.",
};

async function librarian() {
  return staffWithRole(["ceo", "creative_director"]);
}

export async function addLibraryFontAction(
  input: unknown,
): Promise<ActionState> {
  const me = await librarian();
  if (!me) return LIBRARY_ONLY;
  const parsed = libraryFont.safeParse(input);
  const supabase = await createClient();
  const path =
    typeof (input as { path?: unknown })?.path === "string"
      ? (input as { path: string }).path
      : null;
  if (!parsed.success) {
    if (path) await supabase.storage.from("fonts").remove([path]);
    return { error: first(parsed.error.issues) };
  }
  const f = parsed.data;
  const { error } = await supabase.from("library_fonts").insert({
    family: f.family,
    weight: f.weight,
    italic: f.italic,
    storage_path: f.path,
    file_name: f.fileName,
    size_bytes: f.size,
    licence_note: f.licence,
    uploaded_by: me.id,
  });
  if (error) {
    await supabase.storage.from("fonts").remove([f.path]);
    return {
      error:
        error.code === "23505"
          ? `${f.family} ${f.weight}${f.italic ? " italic" : ""} is already in the library. Remove it first to replace it.`
          : friendlyError(error, "The font didn't save. Try again."),
    };
  }
  refresh();
  return { ok: `${f.family} added to the library.` };
}

export async function removeLibraryFontAction(
  id: string,
): Promise<ActionState> {
  if (!(await librarian())) return LIBRARY_ONLY;
  if (!uuid.safeParse(id).success) return BAD_INPUT;
  const supabase = await createClient();
  const { data: font } = await supabase
    .from("library_fonts")
    .select("family")
    .eq("id", id)
    .maybeSingle();
  if (!font) return BAD_INPUT;
  // The last file of a family can't go while a pairing still uses it.
  const [{ count: files }, { count: pairings }] = await Promise.all([
    supabase
      .from("library_fonts")
      .select("id", { count: "exact", head: true })
      .eq("family", font.family),
    supabase
      .from("library_pairings")
      .select("id", { count: "exact", head: true })
      .or(`heading_family.eq."${font.family}",body_family.eq."${font.family}"`),
  ]);
  if (files === 1 && pairings)
    return {
      error: `Remove the pairings that use ${font.family} first.`,
    };
  const { data, error } = await supabase
    .from("library_fonts")
    .delete()
    .eq("id", id)
    .select("storage_path");
  if (error || !data?.length) return LIBRARY_ONLY;
  await supabase.storage.from("fonts").remove([data[0].storage_path]);
  refresh();
  return { ok: "Removed from the library." };
}

const BUILT_IN_FAMILIES = new Set(
  FONT_PAIRINGS.flatMap((p) => [p.heading, p.body]),
);

export async function addLibraryPairingAction(
  input: unknown,
): Promise<ActionState> {
  const me = await librarian();
  if (!me) return LIBRARY_ONLY;
  const parsed = libraryPairing.safeParse(input);
  if (!parsed.success) return { error: first(parsed.error.issues) };
  const p = parsed.data;
  if (FONT_PAIRINGS.some((b) => b.heading === p.heading && b.body === p.body))
    return { error: "That pairing is already in the list." };
  const supabase = await createClient();
  const { data: library } = await supabase
    .from("library_fonts")
    .select("family")
    .in("family", [p.heading, p.body]);
  const known = new Set([
    ...BUILT_IN_FAMILIES,
    ...(library ?? []).map((f) => f.family),
  ]);
  const missing = [p.heading, p.body].find((f) => !known.has(f));
  if (missing) return { error: `Add ${missing} to the font library first.` };
  const { error } = await supabase.from("library_pairings").insert({
    heading_family: p.heading,
    body_family: p.body,
    style: p.style,
    good_for: p.goodFor,
    created_by: me.id,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That pairing is already in the list."
          : friendlyError(error, "The pairing didn't save. Try again."),
    };
  refresh();
  return { ok: `${p.heading} + ${p.body} added.` };
}

export async function removeLibraryPairingAction(
  id: string,
): Promise<ActionState> {
  if (!(await librarian())) return LIBRARY_ONLY;
  if (!uuid.safeParse(id).success) return BAD_INPUT;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_pairings")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return LIBRARY_ONLY;
  refresh();
  return { ok: "Pairing removed." };
}

// ---------------------------------------------------------------------------
// Suggestions with Claude
// ---------------------------------------------------------------------------

/**
 * Suggests visuals and copy for the chosen items and writes them into empty
 * fields only. Counts against the 30-a-day limit; on any failure nothing
 * changes.
 */
export async function suggestAction(
  clientId: string,
  itemIds: string[],
): Promise<ActionState & { filled?: number }> {
  if (!(await creative())) return NOT_ALLOWED;
  if (
    !uuid.safeParse(clientId).success ||
    !Array.isArray(itemIds) ||
    itemIds.length < 1 ||
    itemIds.length > 40 ||
    !itemIds.every((i) => uuid.safeParse(i).success)
  ) {
    return BAD_INPUT;
  }
  const { suggest, suggestionsConfigured, SuggestionsUnavailable } =
    await import("@/lib/creative/suggest");
  if (!suggestionsConfigured())
    return {
      error:
        "Suggestions aren't set up yet. Ask Dave to add the Anthropic API key.",
    };

  const supabase = await createClient();
  const [{ data: client }, { data: kit }, { data: brief }, { data: items }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("name, industry")
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("brand_kits")
        .select("colors, heading_font, body_font, voice")
        .eq("client_id", clientId)
        .maybeSingle(),
      supabase
        .from("brand_briefs")
        .select("answers, design_notes")
        .eq("client_id", clientId)
        .maybeSingle(),
      supabase
        .from("content_items")
        .select(
          "id, slot_code, format, scheduled_date, pillar, platform, topic, notes, visual, graphic_copy, caption, hashtags",
        )
        .eq("client_id", clientId)
        .in("id", itemIds),
    ]);
  if (!client || !kit) return NOT_ALLOWED;
  const blank = (v: string | null) => !v || !v.trim();
  const todo = (items ?? []).filter(
    (i) =>
      blank(i.visual) ||
      blank(i.graphic_copy) ||
      blank(i.caption) ||
      blank(i.hashtags),
  );
  if (!todo.length)
    return {
      ok: "Every field already has text. Clear a field to get a new suggestion.",
    };

  const { error: limitError } = await supabase.rpc("claim_suggestion_call", {
    p_client_id: clientId,
    p_items: todo.length,
  });
  if (limitError)
    return {
      error: friendlyError(limitError, "Suggestions failed. Try again."),
    };

  let suggestions;
  try {
    suggestions = await suggest({
      client,
      brief: (brief?.answers ?? []) as {
        section: string;
        question: string;
        answer: string;
      }[],
      designNotes: brief?.design_notes ?? null,
      kit: { ...kit, colors: kit.colors as Record<string, string> },
      items: todo.map((i) => ({
        slot: i.slot_code,
        format: i.format,
        date: i.scheduled_date,
        pillar: i.pillar,
        platform: i.platform,
        topic: i.topic,
        notes: i.notes,
      })),
    });
  } catch (e) {
    return {
      error:
        e instanceof SuggestionsUnavailable
          ? e.message
          : "Suggestions failed. Try again.",
    };
  }

  let filled = 0;
  for (const item of todo) {
    const s = suggestions.find((x) => x.slot === item.slot_code);
    if (!s) continue;
    const { data } = await supabase.rpc("apply_suggestions", {
      p_item_id: item.id,
      p_visual: s.visual,
      p_graphic_copy: s.graphic_copy,
      p_caption: s.caption,
      p_hashtags: s.hashtags,
    });
    filled += data?.length ?? 0;
  }
  refresh();
  return {
    ok: filled
      ? `Suggested ${filled} field${filled === 1 ? "" : "s"}. Edit before use.`
      : "Nothing new to suggest.",
    filled,
  };
}
