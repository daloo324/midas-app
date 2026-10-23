import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Marketing" };

export default function MarketingPage() {
  return (
    <ComingSoon title="Marketing" phase={5}>
      Midas Media&apos;s own marketing numbers.
    </ComingSoon>
  );
}
