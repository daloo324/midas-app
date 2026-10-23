import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return (
    <ComingSoon title="Resources" phase={3}>
      Shared fonts, palettes and the inspiration board.
    </ComingSoon>
  );
}
