import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <ComingSoon title="Clients" phase={3}>
      Brand kits and the weekly design board for every client.
    </ComingSoon>
  );
}
