import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Reports & insights" };

export default function ReportsAndInsightsPage() {
  return (
    <ComingSoon title="Reports & insights" phase={4}>
      Monthly reports on how your channels are doing.
    </ComingSoon>
  );
}
