import type { Metadata } from "next";
import { InspirationBoard } from "@/components/creative/inspiration-board";
import { ResourcesHeader } from "@/components/creative/resources-tabs";
import { requireArea } from "@/lib/auth/session";
import { listInspiration } from "@/lib/data/creative";

export const metadata: Metadata = { title: "Design inspiration" };

export default async function InspirationPage() {
  const user = await requireArea("creative");
  const { items, clients } = await listInspiration();
  return (
    <>
      <ResourcesHeader current="/creative/resources/inspiration" />
      <InspirationBoard
        items={items}
        clients={clients}
        me={user.id}
        canDeleteAny={user.role === "ceo" || user.role === "creative_director"}
      />
    </>
  );
}
