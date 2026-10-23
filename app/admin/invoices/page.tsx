import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <ComingSoon title="Invoices" phase={5}>
      Invoices, payments, credit notes and the monthly retainer run.
    </ComingSoon>
  );
}
