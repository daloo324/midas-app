import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <ComingSoon title="Content" phase={4}>
      This month&apos;s content, week by week.
    </ComingSoon>
  );
}
