import type { Metadata } from "next";
import { PaletteBuilder } from "@/components/creative/palette-builder";
import {
  PAIRING_FONTS_HREF,
  ResourcesHeader,
} from "@/components/creative/resources-tabs";
import { requireArea } from "@/lib/auth/session";
import { listPaletteTemplates } from "@/lib/data/creative";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Palette builder" };

export default async function PalettePage() {
  const user = await requireArea("creative");
  const supabase = await createClient();
  const [{ data: clients }, templates] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .neq("status", "ended")
      .order("name"),
    listPaletteTemplates(),
  ]);
  return (
    <>
      <link rel="stylesheet" href={PAIRING_FONTS_HREF} precedence="default" />
      <ResourcesHeader current="/creative/resources/palette" />
      <PaletteBuilder
        clients={clients ?? []}
        templates={templates}
        canManage={user.role === "ceo" || user.role === "creative_director"}
      />
    </>
  );
}
