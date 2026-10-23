import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <ComingSoon title="Services" phase={5}>
      The service catalogue and prices.
    </ComingSoon>
  );
}
