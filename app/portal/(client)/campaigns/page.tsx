import type { Metadata } from "next";
import { CampaignsPage } from "@/components/portal/pages/campaigns";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Campaigns" };

export default async function Page() {
  return <CampaignsPage viewer={await clientViewer()} />;
}
