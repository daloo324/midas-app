import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <ComingSoon title="Overview" phase={4}>
      Your content progress, approvals and account at a glance.
    </ComingSoon>
  );
}
