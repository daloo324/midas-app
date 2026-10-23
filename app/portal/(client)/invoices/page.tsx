import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <ComingSoon title="Invoices" phase={4}>
      Your invoices and payments.
    </ComingSoon>
  );
}
