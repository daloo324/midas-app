import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingSoon title="Settings" phase={5}>
      Company and bank details, invoicing, VAT, capacity and integrations.
    </ComingSoon>
  );
}
