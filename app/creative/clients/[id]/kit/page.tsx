import type { Metadata } from "next";
import { BrandKit } from "@/components/creative/brand-kit";
import { StudioHeader } from "@/components/creative/client-header";
import { requireArea } from "@/lib/auth/session";
import { studioClientOr404 } from "@/lib/creative/page";
import { clientTime, getRunningTimer, minutesSince } from "@/lib/data/creative";
import { todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Brand kit" };

export default async function KitPage({
  params,
}: PageProps<"/creative/clients/[id]/kit">) {
  const user = await requireArea("creative");
  const { id } = await params;
  const client = await studioClientOr404(id);
  const [running, time] = await Promise.all([
    getRunningTimer(),
    clientTime(id, `${todayInGaborone().slice(0, 7)}-01`),
  ]);
  const mine =
    running && running.client_id === id && !running.item_id ? running : null;
  const total = time
    .filter((t) => t.is_brand_kit)
    .reduce((a, t) => a + t.minutes, 0);
  // The running timer ticks on top of the finished minutes.
  const runningMinutes = mine ? minutesSince(mine.started_at) : 0;

  return (
    <>
      <StudioHeader client={client} tab="kit" />
      <BrandKit
        client={client}
        role={user.role}
        timer={{
          runningSince: mine?.started_at ?? null,
          loggedMinutes: Math.max(0, total - runningMinutes),
        }}
      />
    </>
  );
}
