import type { Metadata } from "next";
import {
  CampaignBrief,
  CreateCampaignButton,
} from "@/components/accounts/campaign-brief";
import { ClientHeader } from "@/components/accounts/client-header";
import { MonthEmpty } from "@/components/accounts/month-empty";
import { NotActive } from "@/components/accounts/not-active";
import { clientOr404, resolveMonth } from "@/lib/accounts/page";
import { monthLabel } from "@/lib/content/constants";
import { getDeskMonth } from "@/lib/data/accounts";

export const metadata: Metadata = { title: "Campaign brief" };

export default async function CampaignPage({
  params,
  searchParams,
}: PageProps<"/accounts/clients/[id]/campaign">) {
  const { id } = await params;
  const client = await clientOr404(id);
  const month = resolveMonth((await searchParams).month);
  const active = client.status === "active" || client.status === "paused";
  const m = active ? await getDeskMonth(id, month) : null;

  return (
    <>
      <ClientHeader client={client} tab="campaign" month={month} />
      {!m ? (
        client.status === "active" ? (
          <MonthEmpty clientId={id} month={month} />
        ) : (
          <NotActive clientId={id} status={client.status} />
        )
      ) : m.campaign ? (
        <CampaignBrief
          campaign={m.campaign}
          ads={m.items
            .filter((i) => i.slot_code.startsWith("A"))
            .map((i) => ({ slot: i.slot_code, status: i.status }))}
        />
      ) : (
        <div className="empty-state">
          <h2>No campaign for {monthLabel(month)} yet</h2>
          <p>
            One campaign a month: a promotion, launch or seasonal push. Creating
            it adds three ads to the calendar (A01 feed ad, A02 story ad, A03
            test variant) for the designers.
          </p>
          <CreateCampaignButton monthId={m.id} />
        </div>
      )}
    </>
  );
}
