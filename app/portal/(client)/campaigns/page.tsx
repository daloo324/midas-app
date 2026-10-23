import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <ComingSoon title="Campaigns" phase={4}>
      Your campaigns and their results.
    </ComingSoon>
  );
}
