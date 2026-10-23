import { redirect } from "next/navigation";
import { studioClientOr404 } from "@/lib/creative/page";

// A client opens on the weekly board once the kit is signed off, otherwise on the kit.
export default async function StudioClientPage({
  params,
}: PageProps<"/creative/clients/[id]">) {
  const { id } = await params;
  const client = await studioClientOr404(id);
  redirect(
    `/creative/clients/${id}/${client.kit.status === "approved" ? "board" : "kit"}`,
  );
}
