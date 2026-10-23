import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <ComingSoon title="Clients" phase={2}>
      Your clients&apos; cards for this month: plan, calendar, campaign brief
      and KPIs.
    </ComingSoon>
  );
}
