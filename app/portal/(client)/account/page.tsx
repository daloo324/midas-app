import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <ComingSoon title="Account" phase={4}>
      Your plan, account exec, documents and sign-in.
    </ComingSoon>
  );
}
