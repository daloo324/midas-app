import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Brand assets" };

export default function BrandAssetsPage() {
  return (
    <ComingSoon title="Brand assets" phase={4}>
      Your logos, colours, fonts and brand guide to download.
    </ComingSoon>
  );
}
