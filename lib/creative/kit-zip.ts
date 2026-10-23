import "server-only";
import { Zip, ZipDeflate, ZipPassThrough } from "fflate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  COLOR_ROLES,
  MARK_VARIANTS,
  extensionOf,
  hexToCmyk,
  hexToRgb,
} from "./constants";

// The brand kit as {Client}-Brand-Kit.zip (04-creative.md, "Zip download"),
// streamed file by file from storage. The Supabase client acts as the signed-in
// user, so storage rules decide which files can be read.

const VARIANT_NAME = Object.fromEntries(
  MARK_VARIANTS.map((v) => [v.key, v.label.replace(/\s+/g, "-")]),
);
const WEIGHT_NAME: Record<string, string> = {
  "400": "Regular",
  "500": "Medium",
  "600": "SemiBold",
  "700": "Bold",
};
const COMPRESSED = new Set([
  "png",
  "jpg",
  "jpeg",
  "pdf",
  "woff",
  "woff2",
  "zip",
]);

export function zipSafe(name: string) {
  return (
    name
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "Client"
  );
}

function fileNameFor(
  client: string,
  slot: string,
  original: string,
  used: Set<string>,
): string {
  const ext = extensionOf(original);
  let name: string;
  const mark = /^(logo|icon)_(full|black|white)_/.exec(slot);
  if (mark) {
    name = `${mark[1] === "logo" ? "Logo" : "Icon"}/${client}_${mark[1] === "logo" ? "Logo" : "Icon"}_${VARIANT_NAME[mark[2]]}.${ext}`;
  } else if (slot.startsWith("font_")) {
    const [, role, weight] = slot.split("_");
    name = `Fonts/${role === "heading" ? "Heading" : "Body"}-${WEIGHT_NAME[weight]}-${original.replace(/[/\\]/g, "_")}`;
  } else if (slot === "guide_pdf") {
    name = `Brand-Guide/${client}_Brand-Guide.pdf`;
  } else {
    name = `Patterns-and-extras/${original.replace(/[/\\]/g, "_")}`;
  }
  // Two extras with the same name: number the second.
  let unique = name;
  for (let i = 2; used.has(unique); i++)
    unique = name.replace(/(\.[^./]+)?$/, `-${i}$1`);
  used.add(unique);
  return unique;
}

function coloursAndFonts(
  kit: {
    colors: Record<string, string>;
    heading_font: string | null;
    body_font: string | null;
    voice: string | null;
  },
  clientName: string,
) {
  const lines = [`${clientName} · brand colours and fonts`, ""];
  for (const r of COLOR_ROLES) {
    const hex = kit.colors[r.key];
    if (!hex) continue;
    const [R, G, B] = hexToRgb(hex);
    const [C, M, Y, K] = hexToCmyk(hex);
    lines.push(
      `${r.label}: ${hex.toUpperCase()} · RGB ${R}, ${G}, ${B} · CMYK ${C}, ${M}, ${Y}, ${K} (approximate)`,
    );
  }
  lines.push("Black: #000000", "White: #FFFFFF", "");
  lines.push(
    `Heading font: ${kit.heading_font ?? "not set"}`,
    `Body font: ${kit.body_font ?? "not set"}`,
  );
  if (kit.voice) lines.push("", "Brand voice:", kit.voice);
  return lines.join("\r\n") + "\r\n";
}

/** clientName: pass it when the caller can't read the clients table (the portal). */
export async function kitZipResponse(
  supabase: SupabaseClient<Database>,
  clientId: string,
  clientName?: string,
): Promise<Response> {
  const [{ data: client }, { data: kit }, { data: files }] = await Promise.all([
    clientName
      ? Promise.resolve({ data: { name: clientName } })
      : supabase
          .from("clients")
          .select("name")
          .eq("id", clientId)
          .maybeSingle(),
    supabase
      .from("brand_kits")
      .select("colors, heading_font, body_font, voice")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("brand_kit_files")
      .select("slot, file_name, storage_path")
      .eq("client_id", clientId)
      .order("slot"),
  ]);
  if (!client || !kit) return new Response("Not found", { status: 404 });
  const safe = zipSafe(client.name);
  const used = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) return controller.error(err);
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      (async () => {
        for (const f of files ?? []) {
          const { data: blob, error } = await supabase.storage
            .from("brand-kits")
            .download(f.storage_path);
          if (error || !blob) continue; // a file this person can't read is left out
          const name = fileNameFor(safe, f.slot, f.file_name, used);
          const entry = COMPRESSED.has(extensionOf(f.file_name))
            ? new ZipPassThrough(name)
            : new ZipDeflate(name, { level: 6 });
          zip.add(entry);
          entry.push(new Uint8Array(await blob.arrayBuffer()), true);
        }
        const txt = new ZipDeflate("Colours-and-fonts.txt", { level: 6 });
        zip.add(txt);
        txt.push(
          new TextEncoder().encode(
            coloursAndFonts(
              { ...kit, colors: kit.colors as Record<string, string> },
              client.name,
            ),
          ),
          true,
        );
        zip.end();
      })().catch((e) => controller.error(e));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safe}-Brand-Kit.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
