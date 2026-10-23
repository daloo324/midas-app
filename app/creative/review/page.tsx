import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <ComingSoon title="Review" phase={3}>
      Work waiting for the creative director&apos;s review, oldest first.
    </ComingSoon>
  );
}
