import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  return (
    <ComingSoon title="Approvals" phase={4}>
      Everything waiting for your approval.
    </ComingSoon>
  );
}
