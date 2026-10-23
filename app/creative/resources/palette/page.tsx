import type { Metadata } from "next";
import { PaletteBuilder } from "@/components/creative/palette-builder";
import {
  PAIRING_FONTS_HREF,
  ResourcesHeader,
} from "@/components/creative/resources-tabs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Palette builder" };

export default async function PalettePage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .neq("status", "ended")
    .order("name");
  return (
    <>
      <link rel="stylesheet" href={PAIRING_FONTS_HREF} precedence="default" />
      <ResourcesHeader current="/creative/resources/palette" />
      <PaletteBuilder clients={clients ?? []} />
    </>
  );
}
