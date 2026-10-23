import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <ComingSoon title="Sales" phase={5}>
      The lead pipeline, from new lead to won client.
    </ComingSoon>
  );
}
