import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Quotes" };

export default function QuotesPage() {
  return (
    <ComingSoon title="Quotes" phase={5}>
      Quotes built from the service catalogue, sent as PDFs.
    </ComingSoon>
  );
}
