import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <ComingSoon title="Overview" phase={5}>
      The whole business at a glance: clients, pipeline, money owed and this
      month&apos;s work.
    </ComingSoon>
  );
}
