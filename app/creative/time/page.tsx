import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Time" };

export default function TimePage() {
  return (
    <ComingSoon title="Time" phase={3}>
      Time logged this month.
    </ComingSoon>
  );
}
